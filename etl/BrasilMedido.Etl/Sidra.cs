using System.Globalization;
using System.Text.Json;

namespace BrasilMedido.Etl;

// locality id → (period id → value)
public sealed class VariableSeries
{
    public Dictionary<string, Dictionary<string, double?>> ByLocality { get; } = new();
}

public static class Sidra
{
    public const string BaseUrl = "https://servicodados.ibge.gov.br/api/v3/agregados";

    public static string BuildUrl(IndicatorDef def)
    {
        string variables = def.CvVariable is int cv ? $"{def.Variable}|{cv}" : $"{def.Variable}";
        string levels = def.Municipal ? "N1[all]|N3[all]|N6[all]" : "N1[all]|N3[all]";
        string url = $"{BaseUrl}/{def.Table}/periodos/all/variaveis/{variables}?localidades={levels}";
        return def.Classification.Length == 0 ? url : $"{url}&classificacao={def.Classification}";
    }

    // SIDRA symbols: "-" is an absolute zero; "..", "..." and "X" (not applicable, unavailable, suppressed) become null.
    public static double? ParseValue(string? raw)
    {
        if (raw is null) return null;
        string s = raw.Trim();
        if (s == "-") return 0;
        return double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out double v) ? v : null;
    }

    public static Dictionary<int, VariableSeries> ParseResponse(string json)
    {
        var result = new Dictionary<int, VariableSeries>();
        using JsonDocument doc = JsonDocument.Parse(json);
        foreach (JsonElement variable in doc.RootElement.EnumerateArray())
        {
            int id = int.Parse(variable.GetProperty("id").GetString()!, CultureInfo.InvariantCulture);
            var series = new VariableSeries();
            JsonElement resultados = variable.GetProperty("resultados");
            if (resultados.GetArrayLength() != 1)
                throw new InvalidDataException(
                    $"Variável {id}: esperado 1 resultado (filtro de classificação único), veio {resultados.GetArrayLength()}.");

            foreach (JsonElement s in resultados[0].GetProperty("series").EnumerateArray())
            {
                string locality = s.GetProperty("localidade").GetProperty("id").GetString()!;
                var values = new Dictionary<string, double?>();
                foreach (JsonProperty p in s.GetProperty("serie").EnumerateObject())
                    values[p.Name] = ParseValue(p.Value.GetString());
                series.ByLocality[locality] = values;
            }
            result[id] = series;
        }
        return result;
    }

    // One resultado per category of the ratio's classification; a zero or missing total gives null, never 0%.
    public static VariableSeries ParseRatio(string json, Ratio ratio)
    {
        using JsonDocument doc = JsonDocument.Parse(json);
        JsonElement variable = doc.RootElement[0];
        var byCategory = new Dictionary<string, Dictionary<string, Dictionary<string, double?>>>();
        foreach (JsonElement r in variable.GetProperty("resultados").EnumerateArray())
        {
            string? category = null;
            foreach (JsonElement c in r.GetProperty("classificacoes").EnumerateArray())
                if (c.GetProperty("id").GetString() == ratio.ClassificationId.ToString(CultureInfo.InvariantCulture))
                    category = c.GetProperty("categoria").EnumerateObject().First().Name;
            if (category is null)
                throw new InvalidDataException($"Classificação {ratio.ClassificationId} ausente na resposta.");
            var locs = new Dictionary<string, Dictionary<string, double?>>();
            foreach (JsonElement s in r.GetProperty("series").EnumerateArray())
            {
                var values = new Dictionary<string, double?>();
                foreach (JsonProperty p in s.GetProperty("serie").EnumerateObject())
                    values[p.Name] = ParseValue(p.Value.GetString());
                locs[s.GetProperty("localidade").GetProperty("id").GetString()!] = values;
            }
            byCategory[category] = locs;
        }
        if (!byCategory.TryGetValue(ratio.Total, out var total))
            throw new InvalidDataException($"Categoria total {ratio.Total} ausente.");
        foreach (string n in ratio.Numerator)
            if (!byCategory.ContainsKey(n)) throw new InvalidDataException($"Categoria {n} ausente.");

        var result = new VariableSeries();
        foreach (var (loc, totals) in total)
        {
            var values = new Dictionary<string, double?>();
            foreach (var (period, t) in totals)
            {
                double sum = 0;
                bool missing = false;
                foreach (string n in ratio.Numerator)
                {
                    double? v = byCategory[n].TryGetValue(loc, out var s) && s.TryGetValue(period, out var x) ? x : null;
                    if (v is null) missing = true; else sum += v.Value;
                }
                values[period] = missing || t is null or 0 ? null : Math.Round(sum / t.Value * 100, 1);
            }
            result.ByLocality[loc] = values;
        }
        return result;
    }

    // "2025" → "2025"; "202603" → "3º tri 2026"
    public static string PeriodLabel(string periodId)
    {
        if (periodId.Length == 6)
            return $"{int.Parse(periodId[4..], CultureInfo.InvariantCulture)}º tri {periodId[..4]}";
        return periodId;
    }
}

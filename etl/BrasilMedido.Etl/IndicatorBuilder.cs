namespace BrasilMedido.Etl;

public sealed record Uf(string Id, string Sigla, string Nome, string Regiao);

public sealed record Period(string Id, string Label);

/// <summary>Series and Cv arrays are aligned with Periods; "BR" is the SIDRA N1 series.</summary>
public sealed record IndicatorData(
    string Id,
    IReadOnlyList<Period> Periods,
    IReadOnlyDictionary<string, double?[]> Series,
    IReadOnlyDictionary<string, double?[]>? Cv,
    IReadOnlyList<string> Warnings);

public static class IndicatorBuilder
{
    public const string BrasilKey = "BR";
    private const string BrasilId = "1";

    public static IndicatorData Build(IndicatorDef def, Dictionary<int, VariableSeries> parsed, IReadOnlyList<Uf> ufs)
    {
        if (!parsed.TryGetValue(def.Variable, out VariableSeries? main))
            throw new InvalidDataException($"{def.Id}: variável {def.Variable} ausente na resposta.");
        if (!main.ByLocality.ContainsKey(BrasilId))
            throw new InvalidDataException($"{def.Id}: série nacional (N1) ausente.");

        List<string> missingUfs = ufs.Where(u => !main.ByLocality.ContainsKey(u.Id)).Select(u => u.Sigla).ToList();
        if (missingUfs.Count > 0)
            throw new InvalidDataException($"{def.Id}: UFs ausentes na resposta: {string.Join(", ", missingUfs)}.");

        List<string> periodIds = main.ByLocality.Values
            .SelectMany(v => v.Where(kv => kv.Value is not null).Select(kv => kv.Key))
            .Distinct()
            .OrderBy(p => p, StringComparer.Ordinal)
            .ToList();
        if (periodIds.Count == 0)
            throw new InvalidDataException($"{def.Id}: nenhum valor numérico na resposta.");
        // Unpublished periods stay in the timeline as gaps instead of disappearing.
        periodIds = FillSequence(periodIds);

        var keys = new List<(string Key, string Id)> { (BrasilKey, BrasilId) };
        keys.AddRange(ufs.Select(u => (u.Sigla, u.Id)));

        Dictionary<string, double?[]> series = Align(main, keys, periodIds);
        Dictionary<string, double?[]>? cv = def.CvVariable is int cvId && parsed.TryGetValue(cvId, out VariableSeries? cvSeries)
            ? Align(cvSeries, keys, periodIds)
            : null;

        var warnings = new List<string>();
        for (int i = 0; i < periodIds.Count; i++)
        {
            List<string> gaps = keys.Where(k => series[k.Key][i] is null).Select(k => k.Key).ToList();
            if (gaps.Count == keys.Count)
                warnings.Add($"{Sidra.PeriodLabel(periodIds[i])}: sem divulgação do IBGE.");
            else if (gaps.Count > 0)
                warnings.Add($"{Sidra.PeriodLabel(periodIds[i])}: sem dado para {string.Join(", ", gaps)}.");
        }

        List<Period> periods = periodIds.Select(p => new Period(p, Sidra.PeriodLabel(p))).ToList();
        return new IndicatorData(def.Id, periods, series, cv, warnings);
    }

    /// <summary>Every year (YYYY) or quarter (YYYYQQ) between the first and last period.</summary>
    public static List<string> FillSequence(List<string> sorted)
    {
        var result = new List<string>();
        if (sorted[0].Length == 4)
        {
            for (int y = int.Parse(sorted[0]); y <= int.Parse(sorted[^1]); y++)
                result.Add(y.ToString());
            return result;
        }
        int year = int.Parse(sorted[0][..4]), q = int.Parse(sorted[0][4..]);
        while (true)
        {
            string id = $"{year}{q:00}";
            result.Add(id);
            if (id == sorted[^1]) return result;
            if (++q > 4) { q = 1; year++; }
        }
    }

    private static Dictionary<string, double?[]> Align(VariableSeries source, List<(string Key, string Id)> keys, List<string> periodIds)
    {
        return keys.ToDictionary(
            k => k.Key,
            k => periodIds
                .Select(p => source.ByLocality.TryGetValue(k.Id, out var values) && values.TryGetValue(p, out double? v) ? v : null)
                .ToArray());
    }
}

public sealed record MunicipalData(string Id, string Period, IReadOnlyDictionary<string, double?> Values, IReadOnlyList<string> Missing);

public static class MunicipalBuilder
{
    // A few missing municípios are expected (e.g. created after the Censo); many means a broken response.
    public const int MaxMissing = 30;

    public static MunicipalData Build(IndicatorDef def, VariableSeries main, IReadOnlyCollection<string> municipioIds)
    {
        string period = main.ByLocality.Values
            .SelectMany(v => v.Where(kv => kv.Value is not null).Select(kv => kv.Key))
            .Max(StringComparer.Ordinal) ?? throw new InvalidDataException($"{def.Id}: sem período com dados.");
        var values = new Dictionary<string, double?>();
        var missing = new List<string>();
        foreach (string id in municipioIds)
        {
            double? v = main.ByLocality.TryGetValue(id, out var s) && s.TryGetValue(period, out var x) ? x : null;
            values[id] = v;
            if (v is null) missing.Add(id);
        }
        if (missing.Count > MaxMissing)
            throw new InvalidDataException($"{def.Id}: {missing.Count} municípios sem dado (máximo {MaxMissing}).");
        return new MunicipalData(def.Id, period, values, missing);
    }
}

using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using BrasilMedido.Etl;

// dotnet run --project etl/BrasilMedido.Etl [-- <output dir>]   (default: web/public)
string outDir = Path.GetFullPath(args.Length > 0 ? args[0] : Path.Combine("web", "public"));

var json = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    Converters = { new JsonStringEnumConverter(JsonNamingPolicy.KebabCaseLower) },
};

using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(90) };
http.DefaultRequestHeaders.UserAgent.ParseAdd("BrasilMedido-ETL/1.0");

async Task<string> GetAsync(string url)
{
    for (int attempt = 1; ; attempt++)
    {
        try
        {
            using HttpResponseMessage resp = await http.GetAsync(url);
            resp.EnsureSuccessStatusCode();
            return await resp.Content.ReadAsStringAsync();
        }
        catch (Exception ex) when (attempt < 4 && ex is HttpRequestException or TaskCanceledException)
        {
            Console.WriteLine($"  tentativa {attempt} falhou ({ex.Message}); repetindo...");
            await Task.Delay(TimeSpan.FromSeconds(3 * attempt));
        }
    }
}

// Nothing is written until every download validates, so an IBGE outage never leaves half-updated data.
Console.WriteLine("UFs (IBGE Localidades)...");
JsonArray estados = JsonNode.Parse(await GetAsync("https://servicodados.ibge.gov.br/api/v1/localidades/estados"))!.AsArray();
List<Uf> ufs = estados
    .Select(e => new Uf(
        e!["id"]!.GetValue<int>().ToString(),
        e["sigla"]!.GetValue<string>(),
        e["nome"]!.GetValue<string>(),
        e["regiao"]!["nome"]!.GetValue<string>()))
    .OrderBy(u => u.Nome, StringComparer.Create(new System.Globalization.CultureInfo("pt-BR"), false))
    .ToList();
if (ufs.Count != 27) throw new InvalidDataException($"Esperadas 27 UFs, vieram {ufs.Count}.");

Console.WriteLine("Municípios (IBGE Localidades)...");
JsonArray municipiosRaw = JsonNode.Parse(await GetAsync("https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado"))!.AsArray();
var municipios = municipiosRaw
    .Select(m => new object[] { m!["municipio-id"]!.GetValue<int>().ToString(), m["municipio-nome"]!.GetValue<string>(), m["UF-sigla"]!.GetValue<string>() })
    .ToList();
if (municipios.Count < 5500) throw new InvalidDataException($"Esperados ~5.570 municípios, vieram {municipios.Count}.");
List<string> municipioIds = municipios.Select(m => (string)m[0]).ToList();

Console.WriteLine("Malhas (IBGE Malhas)...");
const string Malhas = "https://servicodados.ibge.gov.br/api/v3/malhas";
string geo = await GetAsync($"{Malhas}/paises/BR?formato=application/vnd.geo%2Bjson&qualidade=intermediaria&intrarregiao=UF");
var geoMunUf = new Dictionary<string, string>();
foreach (Uf uf in ufs)
    geoMunUf[uf.Id] = await GetAsync($"{Malhas}/estados/{uf.Id}?formato=application/json&qualidade=intermediaria&intrarregiao=municipio");

var data = new List<IndicatorData>();
var municipal = new List<MunicipalData>();
foreach (IndicatorDef def in Catalog.Indicators)
{
    Console.WriteLine($"{def.Id} (tabela {def.Table})...");
    string raw = await GetAsync(Sidra.BuildUrl(def));
    Dictionary<int, VariableSeries> parsed = def.Ratio is { } ratio
        ? new() { [def.Variable] = Sidra.ParseRatio(raw, ratio) }
        : Sidra.ParseResponse(raw);
    IndicatorData d = IndicatorBuilder.Build(def, parsed, ufs);
    if (def.Municipal)
    {
        MunicipalData m = MunicipalBuilder.Build(def, parsed[def.Variable], municipioIds);
        Console.WriteLine($"  municípios: {m.Values.Count - m.Missing.Count} com dado, {m.Missing.Count} sem dado");
        municipal.Add(m);
    }
    Console.WriteLine($"  {d.Periods.Count} períodos, {d.Periods[0].Label} a {d.Periods[^1].Label}, {d.Warnings.Count} avisos");
    data.Add(d);
}

// Used to pick which cities get a label in the state view.
Console.WriteLine("populacao-2022 (tabela 4714, municípios)...");
var popDef = new IndicatorDef("populacao-2022", "demografia", "População residente (Censo 2022)", "População", "", "pessoas", 0,
    Polarity.Neutral, DataKind.Observado, "Censo Demográfico 2022", 4714, 93, null, "", "População residente", Municipal: true);
MunicipalData pop2022 = MunicipalBuilder.Build(popDef, Sidra.ParseResponse(await GetAsync(Sidra.BuildUrl(popDef)))[93], municipioIds);
municipal.Add(pop2022);

var catalog = new
{
    generatedAt = DateTimeOffset.UtcNow,
    categories = Catalog.Categories,
    indicators = Catalog.Indicators.Zip(data, (def, d) => new
    {
        def.Id,
        def.CategoryId,
        def.Name,
        def.ShortName,
        def.Description,
        def.Unit,
        def.Decimals,
        def.Polarity,
        def.Kind,
        def.Universe,
        def.Note,
        periodicity = def.Survey.Contains("trimestral") ? "trimestral" : "anual",
        source = new
        {
            publisher = "IBGE",
            survey = def.Survey,
            table = def.Table,
            variable = def.Variable,
            url = $"https://sidra.ibge.gov.br/tabela/{def.Table}",
        },
        coverage = "Brasil e Unidades da Federação",
        firstPeriod = d.Periods[0].Label,
        lastPeriod = d.Periods[^1].Label,
        municipal = def.Municipal,
    }),
};

Directory.CreateDirectory(Path.Combine(outDir, "data", "indicators"));
Directory.CreateDirectory(Path.Combine(outDir, "geo", "mun"));
Directory.CreateDirectory(Path.Combine(outDir, "data", "mun"));
await File.WriteAllTextAsync(Path.Combine(outDir, "geo", "uf.json"), geo);
foreach (var (id, topo) in geoMunUf)
    await File.WriteAllTextAsync(Path.Combine(outDir, "geo", "mun", $"{id}.topo.json"), topo);
await File.WriteAllTextAsync(Path.Combine(outDir, "data", "municipios.json"), JsonSerializer.Serialize(municipios, json));
foreach (MunicipalData m in municipal)
    await File.WriteAllTextAsync(Path.Combine(outDir, "data", "mun", $"{m.Id}.json"), JsonSerializer.Serialize(m, json));
await File.WriteAllTextAsync(Path.Combine(outDir, "data", "ufs.json"), JsonSerializer.Serialize(ufs, json));
await File.WriteAllTextAsync(Path.Combine(outDir, "data", "catalog.json"), JsonSerializer.Serialize(catalog, json));
foreach (IndicatorData d in data)
    await File.WriteAllTextAsync(Path.Combine(outDir, "data", "indicators", $"{d.Id}.json"), JsonSerializer.Serialize(d, json));

Console.WriteLine($"OK: {data.Count} indicadores gravados em {outDir}");

using BrasilMedido.Etl;

namespace BrasilMedido.Etl.Tests;

public class SidraTests
{
    [Theory]
    [InlineData("5.3", 5.3)]
    [InlineData(" 12 ", 12.0)]
    [InlineData("-", 0.0)]
    public void ParseValue_numeric_and_absolute_zero(string raw, double expected)
    {
        Assert.Equal(expected, Sidra.ParseValue(raw));
    }

    [Theory]
    [InlineData("..")]
    [InlineData("...")]
    [InlineData("X")]
    [InlineData("")]
    [InlineData(null)]
    public void ParseValue_symbols_become_null(string? raw)
    {
        Assert.Null(Sidra.ParseValue(raw));
    }

    [Theory]
    [InlineData("2025", "2025")]
    [InlineData("202603", "3º tri 2026")]
    [InlineData("201201", "1º tri 2012")]
    public void PeriodLabel_formats_annual_and_quarterly(string id, string expected)
    {
        Assert.Equal(expected, Sidra.PeriodLabel(id));
    }

    [Fact]
    public void BuildUrl_includes_cv_and_classification()
    {
        IndicatorDef def = Catalog.Indicators.Single(i => i.Id == "analfabetismo");
        Assert.Equal(
            "https://servicodados.ibge.gov.br/api/v3/agregados/7113/periodos/all/variaveis/10267|10268?localidades=N1[all]|N3[all]&classificacao=2[6794]|58[2795]",
            Sidra.BuildUrl(def));
    }

    [Fact]
    public void Catalog_ids_are_unique_and_categories_exist()
    {
        Assert.Equal(Catalog.Indicators.Count, Catalog.Indicators.Select(i => i.Id).Distinct().Count());
        Assert.All(Catalog.Indicators, i => Assert.Contains(Catalog.Categories, c => c.Id == i.CategoryId));
    }
}

public class RatioTests
{
    [Fact]
    public void ParseRatio_sums_numerators_over_total()
    {
        string json = """
            [{"id":"381","resultados":[
              {"classificacoes":[{"id":"67","categoria":{"72120":"Coletado"}}],"series":[{"localidade":{"id":"1"},"serie":{"2022":"60"}},{"localidade":{"id":"9"},"serie":{"2022":"0"}}]},
              {"classificacoes":[{"id":"67","categoria":{"72121":"Caçamba"}}],"series":[{"localidade":{"id":"1"},"serie":{"2022":"15"}},{"localidade":{"id":"9"},"serie":{"2022":"-"}}]},
              {"classificacoes":[{"id":"67","categoria":{"10972":"Total"}}],"series":[{"localidade":{"id":"1"},"serie":{"2022":"80"}},{"localidade":{"id":"9"},"serie":{"2022":"0"}}]}
            ]}]
            """;
        VariableSeries s = Sidra.ParseRatio(json, new Ratio(67, ["72120", "72121"], "10972"));
        Assert.Equal(93.8, s.ByLocality["1"]["2022"]);
        Assert.Null(s.ByLocality["9"]["2022"]); // zero total: undefined, never 0%
    }

    [Fact]
    public void Municipal_builder_rejects_large_gaps()
    {
        var series = new VariableSeries();
        series.ByLocality["1100015"] = new() { ["2022"] = 90 };
        var ids = Enumerable.Range(0, 40).Select(i => $"x{i}").Append("1100015").ToList();
        IndicatorDef def = Catalog.Indicators.Single(i => i.Id == "alfabetizacao");
        Assert.Throws<InvalidDataException>(() => MunicipalBuilder.Build(def, series, ids));
    }
}

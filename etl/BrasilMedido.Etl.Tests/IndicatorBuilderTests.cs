using BrasilMedido.Etl;

namespace BrasilMedido.Etl.Tests;

public class IndicatorBuilderTests
{
    private static readonly IReadOnlyList<Uf> Ufs = [new("11", "RO", "Rondônia", "Norte"), new("35", "SP", "São Paulo", "Sudeste")];

    private static IndicatorDef Def => Catalog.Indicators.Single(i => i.Id == "analfabetismo");

    private static string Response(string roSerie) => $$$"""
        [
          {"id":"10267","resultados":[{"series":[
            {"localidade":{"id":"1"},"serie":{"2023":"5.4","2024":"5.3","2025":"..."}},
            {"localidade":{"id":"11"},"serie":{{{roSerie}}}},
            {"localidade":{"id":"35"},"serie":{"2023":"2.3","2024":"2.2","2025":"..."}}
          ]}]},
          {"id":"10268","resultados":[{"series":[
            {"localidade":{"id":"1"},"serie":{"2023":"1.1","2024":"1.2"}},
            {"localidade":{"id":"11"},"serie":{"2023":"9.0","2024":"8.0"}},
            {"localidade":{"id":"35"},"serie":{"2023":"3.0","2024":"3.1"}}
          ]}]}
        ]
        """;

    [Fact]
    public void Build_uses_official_national_series_and_aligns_periods()
    {
        IndicatorData d = IndicatorBuilder.Build(Def, Sidra.ParseResponse(Response("""{"2023":"5.0","2024":"X","2025":"..."}""")), Ufs);

        // 2025 has no value anywhere, so it is dropped.
        Assert.Equal(["2023", "2024"], d.Periods.Select(p => p.Id));
        Assert.Equal([5.4, 5.3], d.Series["BR"]);
        Assert.Equal([5.0, null], d.Series["RO"]);
        Assert.Equal([3.0, 3.1], d.Cv!["SP"]);
        Assert.Equal(["2024: sem dado para RO."], d.Warnings);
    }

    [Fact]
    public void Build_fails_when_a_uf_is_missing()
    {
        string json = """
            [{"id":"10267","resultados":[{"series":[
              {"localidade":{"id":"1"},"serie":{"2024":"5.3"}},
              {"localidade":{"id":"35"},"serie":{"2024":"2.2"}}
            ]}]}]
            """;
        var ex = Assert.Throws<InvalidDataException>(() => IndicatorBuilder.Build(Def, Sidra.ParseResponse(json), Ufs));
        Assert.Contains("RO", ex.Message);
    }

    [Fact]
    public void Build_fails_without_national_series()
    {
        string json = """
            [{"id":"10267","resultados":[{"series":[
              {"localidade":{"id":"11"},"serie":{"2024":"5.0"}},
              {"localidade":{"id":"35"},"serie":{"2024":"2.2"}}
            ]}]}]
            """;
        Assert.Throws<InvalidDataException>(() => IndicatorBuilder.Build(Def, Sidra.ParseResponse(json), Ufs));
    }
}

public class FillSequenceTests
{
    [Fact]
    public void Annual_gaps_are_filled()
    {
        Assert.Equal(["2019", "2020", "2021", "2022"], IndicatorBuilder.FillSequence(["2019", "2022"]));
    }

    [Fact]
    public void Quarterly_gaps_cross_year_boundary()
    {
        Assert.Equal(["201903", "201904", "202001", "202002"], IndicatorBuilder.FillSequence(["201903", "202002"]));
    }
}

namespace BrasilMedido.Etl;

public enum Polarity { LowerIsBetter, HigherIsBetter, Neutral }

public enum DataKind { Observado, Estimado, Calculado }

public sealed record Category(string Id, string Name, string Description);

/// <summary>One SIDRA variable, one category per classification. The Brasil value comes from level N1, never from averaging states.</summary>
public sealed record IndicatorDef(
    string Id,
    string CategoryId,
    string Name,
    string ShortName,
    string Description,
    string Unit,
    int Decimals,
    Polarity Polarity,
    DataKind Kind,
    string Survey,
    int Table,
    int Variable,
    int? CvVariable,
    string Classification,
    string Universe,
    string? Note = null,
    bool Municipal = false,
    Ratio? Ratio = null);

/// <summary>sum(numerator categories) / total category × 100 over one classification.</summary>
public sealed record Ratio(int ClassificationId, string[] Numerator, string Total);

public static class Catalog
{
    public static readonly IReadOnlyList<Category> Categories =
    [
        new("educacao", "Educação", "Alfabetização e escolaridade da população"),
        new("trabalho", "Trabalho", "Mercado de trabalho e rendimentos"),
        new("renda", "Renda e desigualdade", "Rendimento domiciliar e sua distribuição"),
        new("demografia", "Demografia", "Tamanho da população"),
        new("habitacao", "Condições de vida", "Acesso a serviços nos domicílios"),
    ];

    private const string PnadAnual = "PNAD Contínua anual";
    private const string Censo = "Censo Demográfico 2022";
    private const string CensoNote = "Censo 2022: retrato único de 2022, com dado para todos os 5.570 municípios.";
    private const string PnadTri = "PNAD Contínua trimestral";

    public static readonly IReadOnlyList<IndicatorDef> Indicators =
    [
        new("analfabetismo", "educacao",
            "Taxa de analfabetismo", "Analfabetismo",
            "Percentual de pessoas de 15 anos ou mais que não sabem ler e escrever um bilhete simples.",
            "%", 1, Polarity.LowerIsBetter, DataKind.Estimado,
            PnadAnual, 7113, 10267, 10268, "2[6794]|58[2795]",
            "Pessoas de 15 anos ou mais"),

        new("anos-estudo", "educacao",
            "Média de anos de estudo", "Anos de estudo",
            "Número médio de anos de estudo das pessoas de 25 anos ou mais.",
            "anos", 1, Polarity.HigherIsBetter, DataKind.Estimado,
            PnadAnual, 7126, 3593, 3594, "2[6794]|58[108866]",
            "Pessoas de 25 anos ou mais"),

        new("desocupacao", "trabalho",
            "Taxa de desocupação", "Desocupação",
            "Percentual da força de trabalho que está sem trabalho e procurou emprego na semana de referência.",
            "%", 1, Polarity.LowerIsBetter, DataKind.Estimado,
            PnadTri, 4099, 4099, 4103, "",
            "Pessoas de 14 anos ou mais na força de trabalho"),

        new("subutilizacao", "trabalho",
            "Taxa composta de subutilização", "Subutilização",
            "Soma de desocupados, subocupados por insuficiência de horas e força de trabalho potencial, em relação à força de trabalho ampliada.",
            "%", 1, Polarity.LowerIsBetter, DataKind.Estimado,
            PnadTri, 4099, 4118, 4119, "",
            "Pessoas de 14 anos ou mais"),

        new("informalidade", "trabalho",
            "Taxa de informalidade", "Informalidade",
            "Percentual dos ocupados sem carteira assinada, sem CNPJ ou trabalhadores familiares auxiliares.",
            "%", 1, Polarity.LowerIsBetter, DataKind.Estimado,
            PnadTri, 8529, 12466, 12467, "",
            "Pessoas de 14 anos ou mais ocupadas"),

        new("rendimento-trabalho", "trabalho",
            "Rendimento médio habitual do trabalho", "Rendimento do trabalho",
            "Rendimento médio mensal real habitualmente recebido em todos os trabalhos, deflacionado para o último trimestre da série.",
            "R$", 0, Polarity.HigherIsBetter, DataKind.Estimado,
            PnadTri, 5436, 5933, 5941, "2[6794]",
            "Pessoas de 14 anos ou mais ocupadas com rendimento",
            "Valores reais: a série inteira está a preços do trimestre mais recente."),

        new("rendimento-per-capita", "renda",
            "Rendimento domiciliar per capita", "Renda per capita",
            "Rendimento médio mensal real domiciliar por pessoa, a preços médios do último ano.",
            "R$", 0, Polarity.HigherIsBetter, DataKind.Estimado,
            PnadAnual, 7533, 10816, 10817, "1019[49243]",
            "Moradores em domicílios particulares",
            "Valores reais: a série inteira está a preços médios do ano mais recente."),

        new("gini", "renda",
            "Índice de Gini", "Gini",
            "Desigualdade do rendimento domiciliar per capita: 0 é igualdade total, 1 é desigualdade máxima.",
            "índice", 3, Polarity.LowerIsBetter, DataKind.Calculado,
            PnadAnual, 7435, 10681, 10682, "",
            "Moradores em domicílios particulares",
            "Indicador calculado pelo IBGE a partir das estimativas da PNAD Contínua."),

        new("populacao", "demografia",
            "População residente estimada", "População",
            "Estimativa anual da população residente, publicada pelo IBGE para o TCU.",
            "pessoas", 0, Polarity.Neutral, DataKind.Estimado,
            "Estimativas de População", 6579, 9324, null, "",
            "População residente",
            "O IBGE não publicou estimativa em 2007, 2010, 2022 e 2023 (anos de contagem, censo e revisão pós-censo). Esses anos aparecem como lacuna; os dados do Censo não foram misturados à série."),

        new("internet", "habitacao",
            "Domicílios com internet", "Internet",
            "Percentual de domicílios particulares permanentes em que havia utilização de internet.",
            "%", 1, Polarity.HigherIsBetter, DataKind.Estimado,
            PnadAnual, 7307, 9784, 9785, "1[6795]|688[48534]",
            "Domicílios particulares permanentes"),

        // Censo 2022: available for every município.
        new("alfabetizacao", "educacao",
            "Taxa de alfabetização (Censo)", "Alfabetização",
            "Percentual de pessoas de 15 anos ou mais que sabem ler e escrever, segundo o Censo 2022.",
            "%", 1, Polarity.HigherIsBetter, DataKind.Observado,
            Censo, 10091, 2513, null, "2[6794]|58[95253]|2661[32776]|1[6795]",
            "Pessoas de 15 anos ou mais", CensoNote, Municipal: true),

        new("idade-mediana", "demografia",
            "Idade mediana", "Idade mediana",
            "Idade que divide a população ao meio: metade é mais nova, metade é mais velha.",
            "anos", 0, Polarity.Neutral, DataKind.Observado,
            Censo, 10097, 10613, null, "2661[32776]|1[6795]",
            "População residente", CensoNote, Municipal: true),

        new("densidade", "demografia",
            "Densidade demográfica", "Densidade",
            "Habitantes por quilômetro quadrado, segundo o Censo 2022.",
            "hab/km²", 1, Polarity.Neutral, DataKind.Calculado,
            Censo, 4714, 614, null, "",
            "População residente e área territorial", CensoNote, Municipal: true),

        new("esgoto", "habitacao",
            "Domicílios ligados à rede de esgoto", "Esgoto",
            "Percentual de domicílios com esgoto na rede geral, rede pluvial ou fossa ligada à rede.",
            "%", 1, Polarity.HigherIsBetter, DataKind.Calculado,
            Censo, 10105, 381, null, "11558[46290,46292]|2661[32776]|1[6795]",
            "Domicílios particulares permanentes ocupados",
            "Calculado a partir das contagens de domicílios do Censo 2022 (tabela 10105).", Municipal: true,
            Ratio: new(11558, ["46290"], "46292")),

        new("agua", "habitacao",
            "Domicílios com água da rede geral", "Água encanada",
            "Percentual de domicílios cuja principal forma de abastecimento é a rede geral de distribuição.",
            "%", 1, Polarity.HigherIsBetter, DataKind.Calculado,
            Censo, 10103, 381, null, "301[31471,72053]|2661[32776]|1[6795]",
            "Domicílios particulares permanentes ocupados",
            "Calculado a partir das contagens de domicílios do Censo 2022 (tabela 10103).", Municipal: true,
            Ratio: new(301, ["31471"], "72053")),

        new("lixo", "habitacao",
            "Domicílios com coleta de lixo", "Coleta de lixo",
            "Percentual de domicílios com lixo coletado em casa ou depositado em caçamba de serviço de limpeza.",
            "%", 1, Polarity.HigherIsBetter, DataKind.Calculado,
            Censo, 10109, 381, null, "67[72120,72121,10972]|2661[32776]|1[6795]",
            "Domicílios particulares permanentes ocupados",
            "Calculado a partir das contagens de domicílios do Censo 2022 (tabela 10109).", Municipal: true,
            Ratio: new(67, ["72120", "72121"], "10972")),
    ];
}

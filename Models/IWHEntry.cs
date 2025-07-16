namespace DeutschlandDashboard.Models
{
    public class IWHEntry
    {
        public required string NUTS_ID { get; set; }
        public required string County { get; set; }
        public required int DirectConnections { get; set; }
        public required double TotalWasteHeat { get; set; }
        public required int NumberOfSources { get; set; }
        public required double WeightedScore { get; set; }
        public required double BestScore { get; set; }
        public required double AmountWasteHeatBestScore { get; set; }

        [CsvHelper.Configuration.Attributes.Ignore]
        public double TotalWasteHeatMWh => Math.Round(TotalWasteHeat / 1000000.0, 3);

        [CsvHelper.Configuration.Attributes.Ignore]
        public double AmountWasteHeatBestScoreMWh => Math.Round(AmountWasteHeatBestScore / 1000000.0, 3);

        [CsvHelper.Configuration.Attributes.Ignore]
        public bool IsVisible { get; set; } = true;
    }

    public sealed class IWHEntryMap : CsvHelper.Configuration.ClassMap<IWHEntry>
    {
        public IWHEntryMap()
        {
            Map(m => m.NUTS_ID).Name("NUTS_ID");
            Map(m => m.County).Name("County");
            Map(m => m.DirectConnections).Name("Direct Connections");
            Map(m => m.TotalWasteHeat).Name("Total Waste Heat");
            Map(m => m.NumberOfSources).Name("Number of Sources");
            Map(m => m.WeightedScore).Name("Weighted Score");
            Map(m => m.BestScore).Name("Best Score");
            Map(m => m.AmountWasteHeatBestScore).Name("Amount Waste Heat Best Score");
        }
    }
}
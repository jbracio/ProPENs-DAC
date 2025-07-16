using CsvHelper.Configuration;

namespace DeutschlandDashboard.Models
{
    public sealed class TotalScoreEntryMap : ClassMap<TotalScoreEntry>
    {
        public TotalScoreEntryMap()
        {
            Map(m => m.County).Name("County");
            Map(m => m.TotalScore).Name("Total County Score");
            Map(m => m.WasteHeatScore).Name("Waste Heat Score");
            Map(m => m.ElectricityScore).Name("Cost of CO2 Score");
            Map(m => m.RenewableScore).Name("RES Score");
            Map(m => m.CO2TransportScore).Name("CO2 Transport Score");
            Map(m => m.LandUsageScore).Name("Land Usage Score");
        }
    }
}
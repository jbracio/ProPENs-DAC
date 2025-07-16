using CsvHelper.Configuration;

namespace DeutschlandDashboard.Models
{
    public sealed class TotalScoreEntryMap : ClassMap<TotalScoreEntry>
    {
        public TotalScoreEntryMap()
        {
            Map(m => m.County).Name("County");
            Map(m => m.TotalScore).Name("Total_Score");
            Map(m => m.WasteHeatScore).Name("IWH_Score");
            Map(m => m.ElectricityScore).Name("E_Score");
            Map(m => m.RenewableScore).Name("RES_Score");
            Map(m => m.CO2TransportScore).Name("TP_Score");
            Map(m => m.LandUsageScore).Name("LU_Score");
        }
    }
}
namespace DeutschlandDashboard.Models
{
    public class TotalScoreEntry
    {
        public required string NUTS_ID { get; set; }
        public required string County { get; set; }
        public required double TotalScore { get; set; }
        public required double WasteHeatScore { get; set; }
        public required double ElectricityScore { get; set; }
        public required double RenewableScore { get; set; }
        public required double CO2TransportScore { get; set; }
        public required double LandUsageScore { get; set; }
    }
}
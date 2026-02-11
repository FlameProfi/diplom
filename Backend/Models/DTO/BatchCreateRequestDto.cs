namespace Backend.Models.DTO
{
    public class BatchCreateRequestDto
    {
        public string? BatchNumber { get; set; }

        public string? ProductTypeId { get; set; }

        public double Quantity { get; set; }

        public string? Unit { get; set; }

        public DateTime? ProductionDate { get; set; }

        public DateTime? ExpiryDate { get; set; }

        public string? Parameters { get; set; }

        public string? Barcode { get; set; }

        public string? ExportMarking { get; set; }

        public string? Status { get; set; }

        public string? PackagingType { get; set; }

        public double? MinStock { get; set; }
    }
}

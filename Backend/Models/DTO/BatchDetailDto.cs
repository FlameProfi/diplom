namespace Backend.Models.DTO
{
    public class BatchDetailDto
    {
        public string Id { get; set; } = string.Empty;
        public string BatchNumber { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Unit { get; set; } = string.Empty;
        public double Quantity { get; set; }
        public string? Barcode { get; set; }
        public DateTime CreatedAt { get; set; }
        public ProductTypeSummaryDto? ProductType { get; set; }
        public List<StockItemDetailDto> StockItems { get; set; } = new();
        public List<InventoryMovementDto> InventoryMovements { get; set; } = new();
        public List<BatchDocumentDto> Documents { get; set; } = new();
    }

    public class ProductTypeSummaryDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Unit { get; set; } = string.Empty;
    }

    public class StockItemDetailDto
    {
        public string Id { get; set; } = string.Empty;
        public double Quantity { get; set; }
        public double Reserved { get; set; }
        public WarehouseSummaryDto? Warehouse { get; set; }
    }

    public class WarehouseSummaryDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? Location { get; set; }
    }

    public class InventoryMovementDto
    {
        public string Id { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public double Quantity { get; set; }
        public DateTime Date { get; set; }
        public string? Reason { get; set; }
    }

    public class BatchDocumentDto
    {
        public string Id { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public DateTime UploadDate { get; set; }
    }
}

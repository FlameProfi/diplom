namespace Backend.Models.DTO
{
    public class StockDto
    {
        public string Id { get; set; } = string.Empty;
        public double Quantity { get; set; }
        public double Reserved { get; set; }
        public StockBatchDto Batch { get; set; } = new();
        public StockWarehouseDto Warehouse { get; set; } = new();
    }

    public class StockBatchDto
    {
        public string Id { get; set; } = string.Empty;
        public string BatchNumber { get; set; } = string.Empty;
        public string Unit { get; set; } = string.Empty;
    }

    public class StockWarehouseDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
    }
}

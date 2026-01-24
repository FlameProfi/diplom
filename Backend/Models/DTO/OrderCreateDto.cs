namespace Backend.Models.DTO
{
    public class OrderCreateDto
    {
        public string? OrderNumber { get; set; }
        public string? CustomerId { get; set; }
        public string? Status { get; set; }
        public double? TotalAmount { get; set; }
        public DateTime? ExpectedDelivery { get; set; }
        public string? ProductionNotes { get; set; }
        public string? PackingNotes { get; set; }
        public List<OrderItemCreateDto>? OrderItems { get; set; }
    }

    public class OrderItemCreateDto
    {
        public string? BatchId { get; set; }
        public double? Quantity { get; set; }
        public double? Price { get; set; }
    }
}

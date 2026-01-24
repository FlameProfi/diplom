namespace Backend.Models.DTO
{
    public class OrderDto
    {
        public string Id { get; set; } = string.Empty;
        public string OrderNumber { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public double? TotalAmount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ExpectedDelivery { get; set; }

        public string CustomerId { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;

        public List<OrderItemDto>? OrderItems { get; set; } = new();
    }

    public class OrderItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string BatchId { get; set; } = string.Empty;
        public double Quantity { get; set; }
        public double? Price { get; set; }
        public string BatchNumber { get; set; } = string.Empty; 
    }
}

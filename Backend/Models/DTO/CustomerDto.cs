namespace Backend.Models.DTO
{
    public class CustomerDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Region { get; set; }
        public string? Country { get; set; }
        public string? Address { get; set; }
        public string? TaxId { get; set; }
        public DateTime CreatedAt { get; set; }

        public int OrdersCount { get; set; }
    }
}

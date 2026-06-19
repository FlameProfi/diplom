namespace Backend.Models.DTO;

public class WarehouseCreateDto
{
    public string Name { get; set; } = null!;
    public string Type { get; set; } = null!;
    public string? Location { get; set; }
    public double? Capacity { get; set; }
}

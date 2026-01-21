using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class InventoryMovement
{
    public string Id { get; set; } = null!;

    public string BatchId { get; set; } = null!;

    public string? FromWarehouseId { get; set; }

    public string? ToWarehouseId { get; set; }

    public double Quantity { get; set; }

    public string Type { get; set; } = null!;

    public DateTime Date { get; set; }

    public string? Reason { get; set; }

    public string UserId { get; set; } = null!;

    public virtual Batch Batch { get; set; } = null!;

    public virtual Warehouse? FromWarehouse { get; set; }

    public virtual Warehouse? ToWarehouse { get; set; }

    public virtual User User { get; set; } = null!;
}

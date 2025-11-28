using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Warehouse
{
    public string Id { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string Type { get; set; } = null!;

    public string? Location { get; set; }

    public double? Capacity { get; set; }

    public virtual ICollection<InventoryMovement> InventoryMovementFromWarehouses { get; set; } = new List<InventoryMovement>();

    public virtual ICollection<InventoryMovement> InventoryMovementToWarehouses { get; set; } = new List<InventoryMovement>();

    public virtual ICollection<Shipment> Shipments { get; set; } = new List<Shipment>();

    public virtual ICollection<StockItem> StockItems { get; set; } = new List<StockItem>();
}

using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class StockItem
{
    public string Id { get; set; } = null!;

    public string BatchId { get; set; } = null!;

    public string WarehouseId { get; set; } = null!;

    public double Quantity { get; set; }

    public double Reserved { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Batch Batch { get; set; } = null!;

    public virtual Warehouse Warehouse { get; set; } = null!;
}

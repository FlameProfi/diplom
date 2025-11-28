using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Shipment
{
    public string Id { get; set; } = null!;

    public string OrderId { get; set; } = null!;

    public string? TrackingNumber { get; set; }

    public double? Cost { get; set; }

    public DateTime? EstimatedDate { get; set; }

    public DateTime? ActualDate { get; set; }

    public string? Carrier { get; set; }

    public string? FromWarehouseId { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Warehouse? FromWarehouse { get; set; }

    public virtual Order Order { get; set; } = null!;
}

using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class OrderItem
{
    public string Id { get; set; } = null!;

    public string OrderId { get; set; } = null!;

    public string BatchId { get; set; } = null!;

    public double Quantity { get; set; }

    public double? Price { get; set; }

    public virtual Batch Batch { get; set; } = null!;

    public virtual Order Order { get; set; } = null!;
}

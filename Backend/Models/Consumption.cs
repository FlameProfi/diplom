using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Consumption
{
    public string Id { get; set; } = null!;

    public string BatchId { get; set; } = null!;

    public string MaterialId { get; set; } = null!;

    public double Quantity { get; set; }

    public DateTime Date { get; set; }

    public string? Notes { get; set; }

    public virtual Batch Batch { get; set; } = null!;

    public virtual Material Material { get; set; } = null!;
}

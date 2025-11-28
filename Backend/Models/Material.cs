using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Material
{
    public string Id { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string Unit { get; set; } = null!;

    public double MinStock { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<Consumption> Consumptions { get; set; } = new List<Consumption>();

    public virtual ICollection<Purchase> Purchases { get; set; } = new List<Purchase>();
}

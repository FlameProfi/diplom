using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class ProductType
{
    public string Id { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string Category { get; set; } = null!;

    public string Unit { get; set; } = null!;

    public string? Description { get; set; }

    public virtual ICollection<Batch> Batches { get; set; } = new List<Batch>();
}

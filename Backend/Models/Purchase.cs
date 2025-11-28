using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Purchase
{
    public string Id { get; set; } = null!;

    public string SupplierId { get; set; } = null!;

    public string? MaterialId { get; set; }

    public string? BatchId { get; set; }

    public double Quantity { get; set; }

    public double Cost { get; set; }

    public DateTime Date { get; set; }

    public string Type { get; set; } = null!;

    public string? InvoiceRef { get; set; }

    public virtual Batch? Batch { get; set; }

    public virtual Material? Material { get; set; }

    public virtual Supplier Supplier { get; set; } = null!;
}

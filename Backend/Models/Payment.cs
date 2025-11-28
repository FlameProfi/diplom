using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Payment
{
    public string Id { get; set; } = null!;

    public string InvoiceId { get; set; } = null!;

    public double Amount { get; set; }

    public DateTime Date { get; set; }

    public string? Method { get; set; }

    public virtual Invoice Invoice { get; set; } = null!;
}

using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Contract
{
    public string Id { get; set; } = null!;

    public string CustomerId { get; set; } = null!;

    public string Number { get; set; } = null!;

    public DateTime StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public double Value { get; set; }

    public string Status { get; set; } = null!;

    public virtual Customer Customer { get; set; } = null!;
}

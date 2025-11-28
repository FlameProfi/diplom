using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Invoice
{
    public string Id { get; set; } = null!;

    public string Number { get; set; } = null!;

    public string? OrderId { get; set; }

    public string CustomerId { get; set; } = null!;

    public double Amount { get; set; }

    public string Currency { get; set; } = null!;

    public DateTime IssueDate { get; set; }

    public DateTime? DueDate { get; set; }

    public virtual Customer Customer { get; set; } = null!;

    public virtual Order? Order { get; set; }

    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

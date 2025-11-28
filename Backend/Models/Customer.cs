using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Customer
{
    public string Id { get; set; } = null!;

    public string? UserId { get; set; }

    public string Name { get; set; } = null!;

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string? Region { get; set; }

    public string? Country { get; set; }

    public string? Address { get; set; }

    public string? TaxId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<Contract> Contracts { get; set; } = new List<Contract>();

    public virtual ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    public virtual User? User { get; set; }
}

using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Order
{
    public string Id { get; set; } = null!;

    public string OrderNumber { get; set; } = null!;

    public string CustomerId { get; set; } = null!;

    public double? TotalAmount { get; set; }

    public string Currency { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? ExpectedDelivery { get; set; }

    public string? ProductionNotes { get; set; }

    public string? PackingNotes { get; set; }

    public string? UserId { get; set; }

    public virtual Customer Customer { get; set; } = null!;

    public virtual ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();

    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    public virtual ICollection<Shipment> Shipments { get; set; } = new List<Shipment>();

    public virtual User? User { get; set; }
}

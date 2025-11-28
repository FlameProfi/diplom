using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Batch
{
    public string Id { get; set; } = null!;

    public string BatchNumber { get; set; } = null!;

    public string ProductTypeId { get; set; } = null!;

    public double Quantity { get; set; }

    public string Unit { get; set; } = null!;

    public DateTime? ProductionDate { get; set; }

    public DateTime? ExpiryDate { get; set; }

    public string? Parameters { get; set; }

    public string? Barcode { get; set; }

    public string? ExportMarking { get; set; }

    public string Status { get; set; } = null!;

    public string? PackagingType { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public double? MinStock { get; set; }

    public virtual ICollection<ChangeLog> ChangeLogs { get; set; } = new List<ChangeLog>();

    public virtual ICollection<Consumption> Consumptions { get; set; } = new List<Consumption>();

    public virtual ICollection<Document> Documents { get; set; } = new List<Document>();

    public virtual ICollection<InventoryMovement> InventoryMovements { get; set; } = new List<InventoryMovement>();

    public virtual ICollection<LabAnalysis> LabAnalyses { get; set; } = new List<LabAnalysis>();

    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    public virtual ProductType ProductType { get; set; } = null!;

    public virtual ICollection<Purchase> Purchases { get; set; } = new List<Purchase>();

    public virtual ICollection<StockItem> StockItems { get; set; } = new List<StockItem>();
}

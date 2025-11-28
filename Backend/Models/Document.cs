using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Document
{
    public string Id { get; set; } = null!;

    public string BatchId { get; set; } = null!;

    public string Type { get; set; } = null!;

    public string? FilePath { get; set; }

    public DateTime? ExpiryDate { get; set; }

    public DateTime IssuedDate { get; set; }

    public string? Version { get; set; }

    public virtual Batch Batch { get; set; } = null!;
}

using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class LabAnalysis
{
    public string Id { get; set; } = null!;

    public string BatchId { get; set; } = null!;

    public string Parameters { get; set; } = null!;

    public DateTime Date { get; set; }

    public bool Approved { get; set; }

    public string? LabNotes { get; set; }

    public virtual Batch Batch { get; set; } = null!;
}

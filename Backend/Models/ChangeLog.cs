using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class ChangeLog
{
    public string Id { get; set; } = null!;

    public string BatchId { get; set; } = null!;

    public string UserId { get; set; } = null!;

    public string Action { get; set; } = null!;

    public string? OldValue { get; set; }

    public string? NewValue { get; set; }

    public DateTime Timestamp { get; set; }

    public virtual Batch Batch { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}

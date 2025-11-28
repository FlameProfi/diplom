using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Action
{
    public string Id { get; set; } = null!;

    public string UserId { get; set; } = null!;

    public string Action1 { get; set; } = null!;

    public string? EntityType { get; set; }

    public string? EntityId { get; set; }

    public string? Details { get; set; }

    public DateTime Timestamp { get; set; }

    public virtual User User { get; set; } = null!;
}

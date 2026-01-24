using Backend.Infrastructure;
using Backend.Models;
using Backend.Models.DTO;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrdersController : ControllerBase
    {
        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "NEW",
            "IN_PRODUCTION",
            "PACKED",
            "READY_FOR_SHIPMENT",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED",
        };

        private readonly AppDbContext _context;

        public OrdersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<OrderDto>>> GetOrders()
        {
            var orders = await _context.Orders
              .Include(o => o.Customer)
              .Include(o => o.OrderItems)
              .ThenInclude(oi => oi.Batch)
              .OrderByDescending(o => o.CreatedAt)
              .ToListAsync();

            var orderDtos = orders.Select(o => new OrderDto
            {
                Id = o.Id,
                OrderNumber = o.OrderNumber,
                Status = o.Status,
                TotalAmount = o.TotalAmount,
                CreatedAt = o.CreatedAt,
                ExpectedDelivery = o.ExpectedDelivery,
                CustomerId = o.CustomerId,
                CustomerName = o.Customer?.Name ?? string.Empty,
                OrderItems = o.OrderItems.Select(oi => new OrderItemDto
                {
                    Id = oi.Id,
                    BatchId = oi.BatchId,
                    Quantity = oi.Quantity,
                    Price = oi.Price,
                    BatchNumber = oi.Batch?.BatchNumber ?? string.Empty,
                }).ToList()
            }).ToList();

            return Ok(orderDtos);
        }

        [HttpPost]
        public async Task<ActionResult<Order>> CreateOrder(Order order)
        {
            if (order == null)
            {
                return BadRequest("Order payload is required.");
            }

            order.Status = string.IsNullOrWhiteSpace(order.Status) ? "NEW" : order.Status.Trim();
            if (!AllowedStatuses.Contains(order.Status))
            {
                return BadRequest("Invalid order status.");
            }

            order.Currency = string.IsNullOrWhiteSpace(order.Currency) ? "RUB" : order.Currency.Trim();
            EntityDefaults.ApplyCreationDefaults(order);

            if (order.OrderItems == null)
            {
                order.OrderItems = new List<OrderItem>();
            }

            foreach (var item in order.OrderItems)
            {
                EntityDefaults.ApplyCreationDefaults(item);
                if (string.IsNullOrWhiteSpace(item.OrderId))
                {
                    item.OrderId = order.Id;
                }
            }

            if (!order.OrderItems.Any())
            {
                return BadRequest("Order must contain at least one item.");
            }

            if (order.TotalAmount is null || order.TotalAmount <= 0)
            {
                order.TotalAmount = order.OrderItems.Sum(i => i.Quantity * (i.Price ?? 0));
            }

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetOrders), new { id = order.Id }, order);
        }

        [HttpPatch("{id}/status/{status}")]
        public async Task<IActionResult> UpdateOrderStatus(string id, string status)
        {
            if (!AllowedStatuses.Contains(status))
            {
                return BadRequest("Invalid order status.");
            }

            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound();

            order.Status = status.ToUpperInvariant();
            EntityDefaults.ApplyUpdateDefaults(order);

            await _context.SaveChangesAsync();
            return Ok(order);
        }
    }
}

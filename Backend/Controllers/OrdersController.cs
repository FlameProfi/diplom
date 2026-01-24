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
        public async Task<ActionResult<IEnumerable<OrderDto>>> GetOrders([FromQuery] string? customerId)
        {
            var query = _context.Orders
              .Include(o => o.Customer)
              .Include(o => o.OrderItems)
              .ThenInclude(oi => oi.Batch)
              .AsQueryable();

            if (!string.IsNullOrWhiteSpace(customerId))
            {
                query = query.Where(o => o.CustomerId == customerId);
            }

            var orders = await query
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
        public async Task<ActionResult<Order>> CreateOrder([FromBody] OrderCreateDto orderData)
        {
            if (orderData == null)
            {
                return BadRequest("Order payload is required.");
            }

            if (string.IsNullOrWhiteSpace(orderData.OrderNumber))
            {
                return BadRequest("Order number is required.");
            }

            if (string.IsNullOrWhiteSpace(orderData.CustomerId))
            {
                return BadRequest("Customer is required.");
            }

            var status = string.IsNullOrWhiteSpace(orderData.Status) ? "NEW" : orderData.Status.Trim();
            if (!AllowedStatuses.Contains(status))
            {
                return BadRequest("Invalid order status.");
            }

            var order = new Order
            {
                OrderNumber = orderData.OrderNumber.Trim(),
                CustomerId = orderData.CustomerId.Trim(),
                Status = status.ToUpperInvariant(),
                Currency = "RUB",
                TotalAmount = orderData.TotalAmount,
                ExpectedDelivery = orderData.ExpectedDelivery,
                ProductionNotes = orderData.ProductionNotes,
                PackingNotes = orderData.PackingNotes,
                OrderItems = new List<OrderItem>()
            };

            EntityDefaults.ApplyCreationDefaults(order);

            if (orderData.OrderItems == null || !orderData.OrderItems.Any())
            {
                return BadRequest("Order must contain at least one item.");
            }

            foreach (var item in orderData.OrderItems)
            {
                if (string.IsNullOrWhiteSpace(item.BatchId))
                {
                    return BadRequest("Order item batch is required.");
                }

                if (!item.Quantity.HasValue || item.Quantity <= 0)
                {
                    return BadRequest("Order item quantity must be greater than zero.");
                }

                var orderItem = new OrderItem
                {
                    BatchId = item.BatchId.Trim(),
                    Quantity = item.Quantity.Value,
                    Price = item.Price,
                    OrderId = order.Id
                };

                EntityDefaults.ApplyCreationDefaults(orderItem);
                order.OrderItems.Add(orderItem);
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

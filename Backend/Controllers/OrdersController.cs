using Backend.Infrastructure;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Backend.Models.DTO;
using Backend.Utils;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "ADMIN,MANAGER,LOGIST,ACCOUNTANT,CLIENT")]
    public class OrdersController : ControllerBase
    {
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
                Status = o.Status.ToString(),
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

            if (!Enum.TryParse<OrderStatus>(orderData.Status, ignoreCase: true, out var parsed))
                return BadRequest(new { Message = "Неверный статус заказа" });

            var order = new Order
            {
                OrderNumber = orderData.OrderNumber.Trim(),
                CustomerId = orderData.CustomerId.Trim(),
                Status = parsed,
                Currency = "RUB",
                TotalAmount = orderData.TotalAmount,
                ExpectedDelivery = EnsureUtc.GoEnsureUtc((DateTime)orderData.ExpectedDelivery),
                ProductionNotes = orderData.ProductionNotes,
                PackingNotes = orderData.PackingNotes,
                OrderItems = new List<OrderItem>()
            };
            order.CreatedAt = DateTime.UtcNow;
            order.UpdatedAt = DateTime.UtcNow;

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

            var result = new OrderDto
            {
                Id = order.Id,
                OrderNumber = order.OrderNumber,
                CustomerId = order.CustomerId,
                Status = order.Status.ToString(),      // <- важно
                Currency = order.Currency,
                TotalAmount = order.TotalAmount ?? 0,
                CreatedAt = order.CreatedAt,
                UpdatedAt = order.UpdatedAt,
                ExpectedDelivery = order.ExpectedDelivery,
                ProductionNotes = order.ProductionNotes,
                PackingNotes = order.PackingNotes,
                OrderItems = order.OrderItems.Select(i => new OrderItemDto
                {
                    Id = i.Id,
                    BatchId = i.BatchId,
                    Quantity = i.Quantity,
                    Price = i.Price
                }).ToList()
            };

            return CreatedAtAction(nameof(GetOrders), new { id = order.Id }, result);
        }

        [HttpPatch("{id}/status/{status}")]
        public async Task<IActionResult> UpdateOrderStatus(string id, string status)
        {
            if (!Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var parsed))
                return BadRequest(new { Message = "Неверный статус заказа" });

            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound();

            order.Status = parsed;
            EntityDefaults.ApplyUpdateDefaults(order);

            await _context.SaveChangesAsync();
            return Ok(order);
        }
    }
}

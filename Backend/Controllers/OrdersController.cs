using Backend.Infrastructure;
using Backend.Models;
using Backend.Models.DTO;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrdersController : ControllerBase
    {
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
                Status = "NEW",
                TotalAmount = o.TotalAmount,
                CreatedAt = o.CreatedAt,
                CustomerId = o.CustomerId,
                CustomerName = o.Customer.Name, 
                OrderItems = o.OrderItems.Select(oi => new OrderItemDto
                {
                    Id = oi.Id,
                    Quantity = oi.Quantity,
                    Price = oi.Price,
                    BatchNumber = oi.Batch.BatchNumber 
                }).ToList()
            }).ToList();

            return Ok(orderDtos);
        }

        [HttpPost]
        public async Task<ActionResult<Order>> CreateOrder(Order order)
        {
            EntityDefaults.ApplyCreationDefaults(order);

            _context.Orders.Add(order);
            await _context.SaveChangesAsync(); 

            return CreatedAtAction(nameof(GetOrders), new { id = order.Id }, order);
        }

        [HttpPatch("{id}/status/{status}")]
        public async Task<IActionResult> UpdateOrderStatus(string id, string status)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound();
            //order.Status = status;
            EntityDefaults.ApplyUpdateDefaults(order);

            await _context.SaveChangesAsync();
            return Ok(order);
        }
    }
}

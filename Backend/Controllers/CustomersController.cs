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
    public class CustomersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CustomersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CustomerDto>>> GetCustomers([FromQuery] string? region)
        {
            var query = _context.Customers.AsQueryable();
            if (!string.IsNullOrEmpty(region))
            {
                query = query.Where(c => c.Region.Contains(region));
            }

            var customerDtos = await query
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new CustomerDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Email = c.Email,
                    Phone = c.Phone,
                    Region = c.Region,
                    Country = c.Country,
                    Address = c.Address,
                    TaxId = c.TaxId,
                    CreatedAt = c.CreatedAt,
                    OrdersCount = c.Orders.Count
                })
                .ToListAsync();

            return Ok(customerDtos);
        }

        [HttpPost]
        public async Task<ActionResult<Customer>> CreateCustomer(Customer customer)
        {
            EntityDefaults.ApplyCreationDefaults(customer);

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCustomers), new { id = customer.Id }, customer);
        }
    }
}

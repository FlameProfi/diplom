using Backend.Infrastructure;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "ADMIN")]
    [Produces("application/json")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<User>>> GetAll()
        {
            var items = await _context.Users.ToListAsync();
            return Ok(items);
        }

        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<User>> GetById(string id)
        {
            var item = await _context.Users.FindAsync(id);
            if (item == null)
            {
                return NotFound();
            }

            return Ok(item);
        }

        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        public async Task<ActionResult<User>> Create(User item)
        {
            item.Role = string.IsNullOrWhiteSpace(item.Role) ? "CLIENT" : item.Role.Trim().ToUpperInvariant();
            if (!string.IsNullOrWhiteSpace(item.PasswordHash))
            {
                item.PasswordHash = BCrypt.Net.BCrypt.HashPassword(item.PasswordHash);
            }

            EntityDefaults.ApplyCreationDefaults(item);
            _context.Users.Add(item);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
        }

        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<User>> Update(string id, User item)
        {
            if (id != item.Id)
            {
                return BadRequest("ID не совпадает");
            }

            var existing = await _context.Users.FindAsync(id);
            if (existing == null)
            {
                return NotFound();
            }

            var incomingPassword = item.PasswordHash;
            _context.Entry(existing).CurrentValues.SetValues(item);

            if (!string.IsNullOrWhiteSpace(incomingPassword))
            {
                existing.PasswordHash = BCrypt.Net.BCrypt.HashPassword(incomingPassword);
            }

            existing.Role = string.IsNullOrWhiteSpace(existing.Role) ? "CLIENT" : existing.Role.Trim().ToUpperInvariant();
            EntityDefaults.ApplyUpdateDefaults(existing);
            await _context.SaveChangesAsync();

            return Ok(existing);
        }

        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(string id)
        {
            var existing = await _context.Users.FindAsync(id);
            if (existing == null)
            {
                return NotFound();
            }

            _context.Users.Remove(existing);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}

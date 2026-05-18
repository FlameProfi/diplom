using Backend.Infrastructure;
using Backend.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ActionEntity = Backend.Models.Action;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "ADMIN,MANAGER")]
    [Produces("application/json")]
    public class ActionsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ActionsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<ActionEntity>>> GetAll()
        {
            var items = await _context.Actions.ToListAsync();
            return Ok(items);
        }

        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ActionEntity>> GetById(string id)
        {
            var item = await _context.Actions.FindAsync(id);
            if (item == null)
            {
                return NotFound();
            }

            return Ok(item);
        }

        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        public async Task<ActionResult<ActionEntity>> Create(ActionEntity item)
        {
            EntityDefaults.ApplyCreationDefaults(item);
            _context.Actions.Add(item);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
        }

        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ActionEntity>> Update(string id, ActionEntity item)
        {
            if (id != item.Id)
            {
                return BadRequest("ID не совпадает");
            }

            var existing = await _context.Actions.FindAsync(id);
            if (existing == null)
            {
                return NotFound();
            }

            _context.Entry(existing).CurrentValues.SetValues(item);
            EntityDefaults.ApplyUpdateDefaults(existing);
            await _context.SaveChangesAsync();

            return Ok(existing);
        }

        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(string id)
        {
            var existing = await _context.Actions.FindAsync(id);
            if (existing == null)
            {
                return NotFound();
            }

            _context.Actions.Remove(existing);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}

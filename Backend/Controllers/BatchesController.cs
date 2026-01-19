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
    [Produces("application/json")]
    public class BatchesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<BatchesController> _logger;

        public BatchesController(AppDbContext context, ILogger<BatchesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<BatchDto>>> GetBatches([FromQuery] string? status = null, [FromQuery] int? minQuantity = null)
        {
            try
            {
                var query = _context.Batches
                  .Include(b => b.ProductType)
                  .Include(b => b.StockItems)
                  .ThenInclude(s => s.Warehouse)
                  .AsQueryable();

                if (!string.IsNullOrEmpty(status))
                    query = query.Where(b => b.Status == status);

                if (minQuantity.HasValue)
                    query = query.Where(b => b.StockItems.Sum(s => s.Quantity) >= minQuantity.Value);

                var batches = await query.OrderByDescending(b => b.CreatedAt).ToListAsync();

                var dtos = batches.Select(b => new BatchDto
                {
                    Id = b.Id,
                    BatchNumber = b.BatchNumber,
                    Quantity = b.StockItems.Sum(s => s.Quantity),  
                    Unit = b.ProductType.Unit,
                    Status = b.Status,
                    Barcode = b.Barcode,
                    CreatedAt = b.CreatedAt,
                    ProductTypeId = b.ProductTypeId,
                    ProductTypeName = b.ProductType.Name,
                    StockItems = b.StockItems.Select(s => new StockItemDto
                    {
                        Id = s.Id,
                        Quantity = s.Quantity,
                        Reserved = s.Reserved,
                        WarehouseName = s.Warehouse.Name
                    }).ToList()
                }).ToList();

                return Ok(dtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching batches");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("barcode/{barcode}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<BatchDto>> GetBatchByBarcode(string barcode)
        {
            try
            {
                var batch = await _context.Batches
                  .Include(b => b.ProductType)
                  .Include(b => b.StockItems)
                  .ThenInclude(s => s.Warehouse)
                  .FirstOrDefaultAsync(b => b.Barcode == barcode);

                if (batch == null)
                    return NotFound(new { Message = "Партия не найдена по баркоду" });

                var dto = new BatchDto
                {
                    Id = batch.Id,
                    BatchNumber = batch.BatchNumber,
                    Quantity = batch.StockItems.Sum(s => s.Quantity),
                    Unit = batch.ProductType.Unit,
                    Status = batch.Status,
                    Barcode = batch.Barcode,
                    CreatedAt = batch.CreatedAt,
                    ProductTypeId = batch.ProductTypeId,
                    ProductTypeName = batch.ProductType.Name,
                    StockItems = batch.StockItems.Select(s => new StockItemDto
                    {
                        Id = s.Id,
                        Quantity = s.Quantity,
                        Reserved = s.Reserved,
                        WarehouseName = s.Warehouse.Name
                    }).ToList()
                };

                return Ok(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching batch by barcode {Barcode}", barcode);
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/batches
        [HttpPost]
        //[SwaggerOperation(Summary = "Создать партию")]
        public async Task<ActionResult<Batch>> CreateBatch(Batch batch)
        {
            EntityDefaults.ApplyCreationDefaults(batch);

            _context.Batches.Add(batch);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetBatches), new { id = batch.Id }, batch);
        }

        // PUT: api/batches/{id}
        [HttpPut("{id}")]
        //[SwaggerOperation(Summary = "Обновить партию")]
        public async Task<IActionResult> UpdateBatch(string id, Batch batch)
        {
            if (id != batch.Id) return BadRequest("ID не совпадает");

            var existing = await _context.Batches.FindAsync(id);
            if (existing == null) return NotFound();

            existing.BatchNumber = batch.BatchNumber;
            existing.Quantity = batch.Quantity;
            existing.Status = batch.Status;
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}

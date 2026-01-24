using Backend.Infrastructure;
using Backend.Models;
using Backend.Models.DTO;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Produces("application/json")]
    public class BatchesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<BatchesController> _logger;
        private readonly IWebHostEnvironment _environment;

        public BatchesController(AppDbContext context, ILogger<BatchesController> logger, IWebHostEnvironment environment)
        {
            _context = context;
            _logger = logger;
            _environment = environment;
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
                    ProductType = new ProductTypeSummaryDto
                    {
                        Id = b.ProductType.Id,
                        Name = b.ProductType.Name,
                        Unit = b.ProductType.Unit
                    },
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
                    ProductType = new ProductTypeSummaryDto
                    {
                        Id = batch.ProductType.Id,
                        Name = batch.ProductType.Name,
                        Unit = batch.ProductType.Unit
                    },
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

        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<BatchDetailDto>> GetBatchById(string id)
        {
            var batch = await _context.Batches
                .Include(b => b.ProductType)
                .Include(b => b.StockItems)
                .ThenInclude(s => s.Warehouse)
                .Include(b => b.InventoryMovements)
                .Include(b => b.Documents)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (batch == null)
            {
                return NotFound(new { Message = "Партия не найдена" });
            }

            var dto = new BatchDetailDto
            {
                Id = batch.Id,
                BatchNumber = batch.BatchNumber,
                Quantity = batch.StockItems.Sum(s => s.Quantity),
                Unit = batch.ProductType.Unit,
                Status = batch.Status,
                Barcode = batch.Barcode,
                CreatedAt = batch.CreatedAt,
                ProductType = new ProductTypeSummaryDto
                {
                    Id = batch.ProductType.Id,
                    Name = batch.ProductType.Name,
                    Unit = batch.ProductType.Unit
                },
                StockItems = batch.StockItems.Select(s => new StockItemDetailDto
                {
                    Id = s.Id,
                    Quantity = s.Quantity,
                    Reserved = s.Reserved,
                    Warehouse = new WarehouseSummaryDto
                    {
                        Id = s.Warehouse.Id,
                        Name = s.Warehouse.Name,
                        Type = s.Warehouse.Type,
                        Location = s.Warehouse.Location
                    }
                }).ToList(),
                InventoryMovements = batch.InventoryMovements
                    .OrderByDescending(m => m.Date)
                    .Select(m => new InventoryMovementDto
                    {
                        Id = m.Id,
                        Type = m.Type,
                        Quantity = m.Quantity,
                        Date = m.Date,
                        Reason = m.Reason
                    }).ToList(),
                Documents = batch.Documents.Select(d => new BatchDocumentDto
                {
                    Id = d.Id,
                    Type = d.Type,
                    FilePath = d.FilePath ?? string.Empty,
                    FileName = GetDisplayFileName(d.FilePath),
                    FileSize = GetFileSize(d.FilePath),
                    UploadDate = d.IssuedDate
                }).ToList()
            };

            return Ok(dto);
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

        [HttpPut("{id}/status")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<Batch>> UpdateBatchStatus(string id, [FromBody] BatchStatusUpdateRequest request)
        {
            var batch = await _context.Batches.FindAsync(id);
            if (batch == null)
            {
                return NotFound(new { Message = "Партия не найдена" });
            }

            batch.Status = request.Status;
            batch.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(batch);
        }

        [HttpPost("{id}/documents")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<BatchDocumentDto>> UploadDocument(string id, IFormFile? file, [FromForm] string? type = null)
        {
            var batch = await _context.Batches.FindAsync(id);
            if (batch == null)
            {
                return NotFound(new { Message = "Партия не найдена" });
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { Message = "Файл пуст" });
            }

            var uploadsRoot = Path.Combine(_environment.ContentRootPath, "uploads", "batches");
            Directory.CreateDirectory(uploadsRoot);

            var safeOriginalName = Path.GetFileName(file.FileName);
            var fileName = $"{Guid.NewGuid():N}__{safeOriginalName}";
            var filePath = Path.Combine(uploadsRoot, fileName);

            await using (var stream = System.IO.File.Create(filePath))
            {
                await file.CopyToAsync(stream);
            }

            var document = new Document
            {
                BatchId = batch.Id,
                Type = string.IsNullOrWhiteSpace(type) ? "GENERAL" : type,
                FilePath = $"/uploads/batches/{fileName}",
                IssuedDate = DateTime.UtcNow
            };

            EntityDefaults.ApplyCreationDefaults(document);
            _context.Documents.Add(document);
            await _context.SaveChangesAsync();

            var dto = new BatchDocumentDto
            {
                Id = document.Id,
                Type = document.Type,
                FilePath = document.FilePath ?? string.Empty,
                FileName = safeOriginalName,
                FileSize = file.Length,
                UploadDate = document.IssuedDate
            };

            return CreatedAtAction(nameof(GetBatchById), new { id = batch.Id }, dto);
        }

        [HttpDelete("documents/{documentId}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteDocument(string documentId)
        {
            var document = await _context.Documents.FindAsync(documentId);
            if (document == null)
            {
                return NotFound(new { Message = "Документ не найден" });
            }

            if (!string.IsNullOrWhiteSpace(document.FilePath))
            {
                var diskPath = Path.Combine(_environment.ContentRootPath, document.FilePath.TrimStart('/'));
                if (System.IO.File.Exists(diskPath))
                {
                    System.IO.File.Delete(diskPath);
                }
            }

            _context.Documents.Remove(document);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private long GetFileSize(string? relativePath)
        {
            if (string.IsNullOrWhiteSpace(relativePath))
            {
                return 0;
            }

            var diskPath = Path.Combine(_environment.ContentRootPath, relativePath.TrimStart('/'));
            if (!System.IO.File.Exists(diskPath))
            {
                return 0;
            }

            var info = new FileInfo(diskPath);
            return info.Length;
        }

        private static string GetDisplayFileName(string? relativePath)
        {
            if (string.IsNullOrWhiteSpace(relativePath))
            {
                return string.Empty;
            }

            var fileName = Path.GetFileName(relativePath);
            var parts = fileName.Split("__", 2);
            return parts.Length == 2 ? parts[1] : fileName;
        }
    }

    public class BatchStatusUpdateRequest
    {
        public string Status { get; set; } = string.Empty;
    }
}

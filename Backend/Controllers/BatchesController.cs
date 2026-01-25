using Backend.Infrastructure;
using Backend.Models;
using Backend.Models.DTO;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Data;
using System.IO;
using System.Text.RegularExpressions;

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

                if (!string.IsNullOrWhiteSpace(status))
                {
                    var normalizedStatus = status.Trim();
                    query = query.Where(b => b.Status == normalizedStatus);
                }

                if (minQuantity.HasValue)
                {
                    query = query.Where(b => (b.StockItems != null ? b.StockItems.Sum(s => s.Quantity) : 0) >= minQuantity.Value);
                }

                var batches = await query
                    .OrderByDescending(b => b.CreatedAt)
                    .ToListAsync();

                var dtos = batches.Select(MapToBatchDtoSafe).ToList();
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
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<BatchDto>> GetBatchByBarcode(string barcode)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(barcode))
                    return BadRequest(new { Message = "Barcode пуст" });

                barcode = barcode.Trim();

                var batch = await _context.Batches
                    .Include(b => b.ProductType)
                    .Include(b => b.StockItems)
                        .ThenInclude(s => s.Warehouse)
                    .FirstOrDefaultAsync(b => b.Barcode == barcode);

                if (batch == null)
                    return NotFound(new { Message = "Партия не найдена по баркоду" });

                return Ok(MapToBatchDtoSafe(batch));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching batch by barcode {Barcode}", barcode);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<BatchDetailDto>> GetBatchById(string id)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(id))
                    return BadRequest(new { Message = "ID пуст" });

                id = id.Trim();

                var batch = await _context.Batches
                    .Include(b => b.ProductType)
                    .Include(b => b.StockItems)
                        .ThenInclude(s => s.Warehouse)
                    .Include(b => b.InventoryMovements)
                    .Include(b => b.Documents)
                    .FirstOrDefaultAsync(b => b.Id == id);

                if (batch == null)
                    return NotFound(new { Message = "Партия не найдена" });

                var dto = MapToBatchDetailDtoSafe(batch);
                return Ok(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching batch by id {Id}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<Batch>> CreateBatch([FromBody] Batch batch)
        {
            try
            {
                if (batch == null)
                    return BadRequest(new { Message = "Тело запроса пустое" });

                EntityDefaults.ApplyCreationDefaults(batch);

                _context.Batches.Add(batch);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetBatchById), new { id = batch.Id }, new BatchDto
                {
                    Id = batch.Id,
                    BatchNumber = batch.BatchNumber,
                    Quantity = batch.Quantity,
                    Status = batch.Status,
                    Barcode = batch.Barcode,
                    CreatedAt = batch.CreatedAt,
                    ProductTypeId = batch.ProductTypeId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating batch");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateBatch(string id, [FromBody] Batch batch)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(id))
                    return BadRequest(new { Message = "ID пуст" });

                if (batch == null)
                    return BadRequest(new { Message = "Тело запроса пустое" });

                id = id.Trim();

                if (!string.Equals(id, batch.Id, StringComparison.Ordinal))
                    return BadRequest("ID не совпадает");

                var existing = await _context.Batches.FindAsync(id);
                if (existing == null)
                    return NotFound();

                existing.BatchNumber = batch.BatchNumber;
                existing.Quantity = batch.Quantity;
                existing.Status = batch.Status;

                // ты говорил, что DateTime уже решил — оставляю как есть
                existing.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating batch {Id}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPut("{id}/status")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<object>> UpdateBatchStatus(string id, [FromBody] BatchStatusUpdateRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(id))
                    return BadRequest(new { Message = "ID пуст" });

                if (request == null || string.IsNullOrWhiteSpace(request.Status))
                    return BadRequest(new { Message = "Статус обязателен" });

                id = id.Trim();

                var batch = await _context.Batches.FindAsync(id);
                if (batch == null)
                    return NotFound(new { Message = "Партия не найдена" });

                batch.Status = request.Status.Trim().ToUpperInvariant();
                batch.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new { batch.Id, batch.Status });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating batch status {Id}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPost("{id}/documents")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<BatchDocumentDto>> UploadDocument(
    string id,
    IFormFile? file,
    [FromForm] string? type = null)
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest(new { Message = "ID пуст" });

            id = id.Trim();

            var batch = await _context.Batches.FindAsync(id);
            if (batch == null)
                return NotFound(new { Message = "Партия не найдена" });

            if (file == null || file.Length == 0)
                return BadRequest(new { Message = "Файл пуст" });

            var uploadsRoot = Path.Combine(_environment.ContentRootPath, "uploads", "batches");
            Directory.CreateDirectory(uploadsRoot);

            var safeOriginalName = Path.GetFileName(file.FileName);
            if (string.IsNullOrWhiteSpace(safeOriginalName))
                safeOriginalName = "document";

            var fileName = $"{Guid.NewGuid():N}__{safeOriginalName}";
            var diskPath = Path.Combine(uploadsRoot, fileName);

            await using (var stream = System.IO.File.Create(diskPath))
                await file.CopyToAsync(stream);

            var publicPath = $"/uploads/batches/{fileName}";

            var document = new Document
            {
                BatchId = batch.Id,
                Type = string.IsNullOrWhiteSpace(type) ? "GENERAL" : type.Trim(),
                FilePath = publicPath,
                IssuedDate = DateTime.UtcNow
            };

            EntityDefaults.ApplyCreationDefaults(document);
            _context.Documents.Add(document);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException dbEx) when (dbEx.InnerException is PostgresException pg)
            {
                // если БД ругается на enum — попробуем починить регистр/значение
                if (pg.SqlState == "22P02" && TryParseEnumError(pg, out var enumType, out var badValue))
                {
                    var labels = await GetPgEnumLabelsAsync(enumType);

                    // если отличие только в регистре — автоматически подставим корректное и повторим
                    var fixedLabel = labels.FirstOrDefault(x => string.Equals(x, badValue, StringComparison.OrdinalIgnoreCase));
                    if (!string.IsNullOrWhiteSpace(fixedLabel))
                    {
                        document.Type = fixedLabel;
                        await _context.SaveChangesAsync();

                        var okDto = new BatchDocumentDto
                        {
                            Id = document.Id,
                            Type = document.Type,
                            FilePath = publicPath,
                            FileName = safeOriginalName,
                            FileSize = file.Length,
                            UploadDate = document.IssuedDate
                        };

                        return CreatedAtAction(nameof(GetBatchById), new { id = batch.Id }, okDto);
                    }

                    // иначе — говорим, какие значения реально есть в enum
                    return BadRequest(new
                    {
                        Message = $"Неверное значение типа документа: '{badValue}'. Допустимые значения: {string.Join(", ", labels)}"
                    });
                }

                _logger.LogError(dbEx, "DB error uploading document for batch {BatchId}", id);
                return StatusCode(500, "Не удалось сохранить документ в базе");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при загрузке документа для партии {BatchId}", id);
                return StatusCode(500, "Не удалось загрузить документ");
            }

            var dto = new BatchDocumentDto
            {
                Id = document.Id,
                Type = document.Type,
                FilePath = publicPath,
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
            try
            {
                if (string.IsNullOrWhiteSpace(documentId))
                    return NotFound(new { Message = "Документ не найден" });

                documentId = documentId.Trim();

                var document = await _context.Documents.FindAsync(documentId);
                if (document == null)
                    return NotFound(new { Message = "Документ не найден" });

                if (!string.IsNullOrWhiteSpace(document.FilePath))
                {
                    var diskPath = Path.Combine(_environment.ContentRootPath, document.FilePath.TrimStart('/'));
                    try
                    {
                        if (System.IO.File.Exists(diskPath))
                            System.IO.File.Delete(diskPath);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to delete file from disk: {DiskPath}", diskPath);
                    }
                }

                _context.Documents.Remove(document);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting document {DocumentId}", documentId);
                return StatusCode(500, "Internal server error");
            }
        }

        private static bool TryParseEnumError(PostgresException pg, out string enumType, out string badValue)
        {
            enumType = "";
            badValue = "";

            // примеры:
            // invalid input value for enum "MovementType": "receipt"
            // invalid input value for enum "DocumentType": "general"
            var m = Regex.Match(pg.MessageText ?? "", "enum \"(?<t>.+?)\": \"(?<v>.+?)\"");
            if (!m.Success) return false;

            enumType = m.Groups["t"].Value;
            badValue = m.Groups["v"].Value;
            return !(string.IsNullOrWhiteSpace(enumType) || string.IsNullOrWhiteSpace(badValue));
        }

        private async Task<List<string>> GetPgEnumLabelsAsync(string enumTypeName)
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
                await conn.OpenAsync();

            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
        select e.enumlabel
        from pg_enum e
        join pg_type t on t.oid = e.enumtypid
        where t.typname = @n or t.typname = lower(@n)
        order by e.enumsortorder;
    ";

            var p = cmd.CreateParameter();
            p.ParameterName = "n";
            p.Value = enumTypeName;
            cmd.Parameters.Add(p);

            var result = new List<string>();
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                result.Add(reader.GetString(0));

            return result;
        }

        private BatchDto MapToBatchDtoSafe(Batch b)
        {
            var stockItems = b.StockItems ?? new List<StockItem>();
            var productType = b.ProductType;

            return new BatchDto
            {
                Id = b.Id,
                BatchNumber = b.BatchNumber,
                Quantity = stockItems.Sum(s => s.Quantity),
                Unit = productType?.Unit ?? string.Empty,
                Status = b.Status,
                Barcode = b.Barcode,
                CreatedAt = b.CreatedAt,
                ProductTypeId = b.ProductTypeId,
                ProductTypeName = productType?.Name ?? string.Empty,
                ProductType = productType == null
                    ? null
                    : new ProductTypeSummaryDto
                    {
                        Id = productType.Id,
                        Name = productType.Name,
                        Unit = productType.Unit
                    },
                StockItems = stockItems.Select(s => new StockItemDto
                {
                    Id = s.Id,
                    Quantity = s.Quantity,
                    Reserved = s.Reserved,
                    WarehouseName = s.Warehouse?.Name ?? "Unknown warehouse"
                }).ToList()
            };
        }

        private BatchDetailDto MapToBatchDetailDtoSafe(Batch b)
        {
            var stockItems = b.StockItems ?? new List<StockItem>();
            var productType = b.ProductType;

            return new BatchDetailDto
            {
                Id = b.Id,
                BatchNumber = b.BatchNumber,
                Quantity = stockItems.Sum(s => s.Quantity),
                Unit = productType?.Unit ?? string.Empty,
                Status = b.Status,
                Barcode = b.Barcode,
                CreatedAt = b.CreatedAt,
                ProductType = productType == null
                    ? null
                    : new ProductTypeSummaryDto
                    {
                        Id = productType.Id,
                        Name = productType.Name,
                        Unit = productType.Unit
                    },
                StockItems = stockItems.Select(s => new StockItemDetailDto
                {
                    Id = s.Id,
                    Quantity = s.Quantity,
                    Reserved = s.Reserved,
                    Warehouse = s.Warehouse == null
                        ? new WarehouseSummaryDto
                        {
                            Id = string.Empty,
                            Name = "Unknown warehouse",
                            Type = string.Empty,
                            Location = string.Empty
                        }
                        : new WarehouseSummaryDto
                        {
                            Id = s.Warehouse.Id,
                            Name = s.Warehouse.Name,
                            Type = s.Warehouse.Type,
                            Location = s.Warehouse.Location
                        }
                }).ToList(),
                InventoryMovements = (b.InventoryMovements ?? new List<InventoryMovement>())
                    .OrderByDescending(m => m.Date)
                    .Select(m => new InventoryMovementDto
                    {
                        Id = m.Id,
                        Type = m.Type.ToString() ?? string.Empty,
                        Quantity = m.Quantity,
                        Date = m.Date,
                        Reason = m.Reason
                    }).ToList(),
                Documents = (b.Documents ?? new List<Document>())
                    .Select(d => new BatchDocumentDto
                    {
                        Id = d.Id,
                        Type = d.Type,
                        FilePath = d.FilePath ?? string.Empty,
                        FileName = GetDisplayFileName(d.FilePath),
                        FileSize = GetFileSizeSafe(d.FilePath),
                        UploadDate = d.IssuedDate
                    }).ToList()
            };
        }

        private long GetFileSizeSafe(string? filePath)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(filePath))
                    return 0;

                // filePath: "/uploads/batches/xxx.pdf"
                var relative = filePath.TrimStart('/', '\\');

                var diskPath = Path.Combine(_environment.ContentRootPath, relative.Replace('/', Path.DirectorySeparatorChar));

                if (!System.IO.File.Exists(diskPath))
                    return 0;

                return new FileInfo(diskPath).Length;
            }
            catch
            {
                return 0;
            }
        }

        private static string GetDisplayFileName(string? relativePath)
        {
            if (string.IsNullOrWhiteSpace(relativePath))
                return string.Empty;

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

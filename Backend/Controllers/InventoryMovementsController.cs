using Backend.Infrastructure;
using Backend.Models;
using Backend.Models.DTO;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [Route("api/inventory-movements")]
    [ApiController]
    [Authorize(Roles = "ADMIN,WAREHOUSE_WORKER,MANAGER,LOGIST")]
    [Produces("application/json")]
    public class InventoryMovementsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public InventoryMovementsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<InventoryMovementSummaryDto>>> GetAll()
        {
            var items = await _context.InventoryMovements
                .Include(m => m.Batch)
                .Include(m => m.FromWarehouse)
                .Include(m => m.ToWarehouse)
                .Include(m => m.User)
                .OrderByDescending(m => m.Date)
                .ToListAsync();

            var dtos = items.Select(m => new InventoryMovementSummaryDto
            {
                Id = m.Id,
                BatchId = m.BatchId,
                BatchNumber = m.Batch.BatchNumber,
                Type = m.Type.ToString(),
                Quantity = m.Quantity,
                Date = m.Date,
                Reason = m.Reason,
                UserId = m.UserId,
                UserEmail = m.User?.Email ?? "system",
                FromWarehouseId = m.FromWarehouseId,
                FromWarehouseName = m.FromWarehouse?.Name,
                ToWarehouseId = m.ToWarehouseId,
                ToWarehouseName = m.ToWarehouse?.Name
            }).ToList();

            return Ok(dtos);
        }

        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<InventoryMovementSummaryDto>> GetById(string id)
        {
            var item = await _context.InventoryMovements
                .Include(m => m.Batch)
                .Include(m => m.FromWarehouse)
                .Include(m => m.ToWarehouse)
                .Include(m => m.User)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (item == null)
                return NotFound();

            var dto = new InventoryMovementSummaryDto
            {
                Id = item.Id,
                BatchId = item.BatchId,
                BatchNumber = item.Batch.BatchNumber,
                Type = item.Type.ToString(),
                Quantity = item.Quantity,
                Date = item.Date,
                Reason = item.Reason,
                UserId = item.UserId,
                UserEmail = item.User?.Email ?? "system",
                FromWarehouseId = item.FromWarehouseId,
                FromWarehouseName = item.FromWarehouse?.Name,
                ToWarehouseId = item.ToWarehouseId,
                ToWarehouseName = item.ToWarehouse?.Name
            };

            return Ok(dto);
        }

        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<InventoryMovement>> Create(InventoryMovementRequestDto request)
        {
            if (request.Quantity <= 0)
                return BadRequest(new { Message = "Количество должно быть больше 0" });

            if (string.IsNullOrWhiteSpace(request.BatchId))
                return BadRequest(new { Message = "BatchId обязателен" });

            if (string.IsNullOrWhiteSpace(request.Type))
                return BadRequest(new { Message = "Type обязателен" });

            var batch = await _context.Batches
                .Include(b => b.StockItems)
                .FirstOrDefaultAsync(b => b.Id == request.BatchId);

            if (batch == null)
                return BadRequest(new { Message = "Партия не найдена" });

            // Parse string -> enum (оптимально для PG enum)
            if (!Enum.TryParse<MovementType>(request.Type, ignoreCase: true, out var movementType))
                return BadRequest(new { Message = "Неверный тип движения" });

            var warehouse = await ResolveWarehouseAsync(request, batch);
            if (warehouse == null)
                return BadRequest(new { Message = "Не удалось определить склад" });

            var stockItem = await GetOrCreateStockItemAsync(batch.Id, warehouse.Id);
            if (batch.StockItems.All(s => s.Id != stockItem.Id))
                batch.StockItems.Add(stockItem);

            // Логика движения — по enum (без строковой каши)
            switch (movementType)
            {
                case MovementType.Receipt:
                    stockItem.Quantity += request.Quantity;
                    break;

                case MovementType.Issue:
                    if (request.Quantity > stockItem.Quantity)
                        return BadRequest(new { Message = $"Недостаточно остатка: {stockItem.Quantity}" });

                    stockItem.Quantity -= request.Quantity;

                    if (stockItem.Reserved > stockItem.Quantity)
                        stockItem.Reserved = stockItem.Quantity;
                    break;

                case MovementType.Reserve:
                    if (request.Quantity > stockItem.Quantity - stockItem.Reserved)
                        return BadRequest(new { Message = "Недостаточно доступного остатка для резерва" });

                    stockItem.Reserved += request.Quantity;
                    break;

                default:
                    return BadRequest(new { Message = "Неизвестный тип движения" });
            }

            EntityDefaults.ApplyUpdateDefaults(stockItem);

            var movement = new InventoryMovement
            {
                BatchId = batch.Id,

                // сохраняем прежнюю логику выбора складов
                FromWarehouseId = movementType == MovementType.Issue
                    ? request.FromWarehouseId ?? warehouse.Id
                    : request.FromWarehouseId,

                ToWarehouseId = movementType != MovementType.Issue
                    ? request.ToWarehouseId ?? warehouse.Id
                    : request.ToWarehouseId,

                Quantity = request.Quantity,
                Reason = request.Reason,
                UserId = request.UserId ?? "system",

                // ВАЖНО: enum, не string
                Type = movementType
            };

            EntityDefaults.ApplyCreationDefaults(movement);
            _context.InventoryMovements.Add(movement);

            batch.Quantity = batch.StockItems.Sum(s => s.Quantity);
            batch.UpdatedAt = DateTime.UtcNow;

            await CreateLowStockNotificationIfNeeded(batch);
            await _context.SaveChangesAsync();

            var result = new InventoryMovementSummaryDto
            {
                Id = movement.Id,
                BatchId = movement.BatchId,
                BatchNumber = batch.BatchNumber,
                Type = movement.Type.ToString(),
                Quantity = movement.Quantity,
                Date = movement.Date,
                Reason = movement.Reason,
                UserId = movement.UserId,
                UserEmail = "system",
                FromWarehouseId = movement.FromWarehouseId,
                FromWarehouseName = null,
                ToWarehouseId = movement.ToWarehouseId,
                ToWarehouseName = null
            };

            return CreatedAtAction(nameof(GetById), new { id = movement.Id }, result);
        }

        [HttpPost("reserve")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<InventoryMovement>> Reserve(ReserveRequestDto request)
        {
            if (request.Quantity <= 0)
                return BadRequest(new { Message = "Количество должно быть больше 0" });

            var orderItem = await _context.OrderItems
                .Include(oi => oi.Batch)
                    .ThenInclude(b => b.StockItems)
                .FirstOrDefaultAsync(oi => oi.Id == request.OrderItemId);

            if (orderItem == null)
                return BadRequest(new { Message = "Позиция заказа не найдена" });

            if (orderItem.BatchId != request.BatchId)
                return BadRequest(new { Message = "Партия не совпадает с позицией заказа" });

            var batch = orderItem.Batch;

            var warehouse = await GetDefaultWarehouseAsync();
            var stockItem = await GetOrCreateStockItemAsync(batch.Id, warehouse.Id);

            if (batch.StockItems.All(s => s.Id != stockItem.Id))
                batch.StockItems.Add(stockItem);

            var available = stockItem.Quantity - stockItem.Reserved;
            if (request.Quantity > available)
                return BadRequest(new { Message = $"Недостаточно доступного остатка: {available}" });

            stockItem.Reserved += request.Quantity;
            EntityDefaults.ApplyUpdateDefaults(stockItem);

            var movement = new InventoryMovement
            {
                BatchId = batch.Id,
                Quantity = request.Quantity,
                Reason = $"RESERVE_ORDER_ITEM:{orderItem.Id}",
                UserId = request.UserId ?? "system",
                Type = MovementType.Reserve, // enum
                ToWarehouseId = warehouse.Id
            };

            EntityDefaults.ApplyCreationDefaults(movement);
            _context.InventoryMovements.Add(movement);

            batch.Quantity = batch.StockItems.Sum(s => s.Quantity);
            batch.UpdatedAt = DateTime.UtcNow;

            await CreateLowStockNotificationIfNeeded(batch);
            await _context.SaveChangesAsync();

            var result = new InventoryMovementSummaryDto
            {
                Id = movement.Id,
                BatchId = movement.BatchId,
                BatchNumber = batch.BatchNumber,
                Type = movement.Type.ToString(),
                Quantity = movement.Quantity,
                Date = movement.Date,
                Reason = movement.Reason,
                UserId = movement.UserId,
                UserEmail = "system",
                FromWarehouseId = movement.FromWarehouseId,
                FromWarehouseName = null,
                ToWarehouseId = movement.ToWarehouseId,
                ToWarehouseName = null
            };

            return CreatedAtAction(nameof(GetById), new { id = movement.Id }, result);
        }

        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<InventoryMovement>> Update(string id, InventoryMovement item)
        {
            if (id != item.Id)
                return BadRequest("ID не совпадает");

            var existing = await _context.InventoryMovements.FindAsync(id);
            if (existing == null)
                return NotFound();

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
            var existing = await _context.InventoryMovements.FindAsync(id);
            if (existing == null)
                return NotFound();

            _context.InventoryMovements.Remove(existing);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private async Task<Warehouse?> ResolveWarehouseAsync(InventoryMovementRequestDto request, Batch batch)
        {
            if (!string.IsNullOrWhiteSpace(request.ToWarehouseId))
                return await _context.Warehouses.FindAsync(request.ToWarehouseId);

            if (!string.IsNullOrWhiteSpace(request.FromWarehouseId))
                return await _context.Warehouses.FindAsync(request.FromWarehouseId);

            return await GetDefaultWarehouseAsync();
        }

        private async Task<Warehouse> GetDefaultWarehouseAsync()
        {
            var warehouse = await _context.Warehouses.FirstOrDefaultAsync();
            if (warehouse != null)
                return warehouse;

            warehouse = new Warehouse
            {
                Id = Guid.NewGuid().ToString(),
                Name = "Основной склад",
                Type = "MAIN"
            };

            _context.Warehouses.Add(warehouse);
            await _context.SaveChangesAsync();

            return warehouse;
        }

        private async Task<StockItem> GetOrCreateStockItemAsync(string batchId, string warehouseId)
        {
            var stockItem = await _context.StockItems
                .FirstOrDefaultAsync(s => s.BatchId == batchId && s.WarehouseId == warehouseId);

            if (stockItem != null)
                return stockItem;

            stockItem = new StockItem
            {
                Id = Guid.NewGuid().ToString(),
                BatchId = batchId,
                WarehouseId = warehouseId,
                Quantity = 0,
                Reserved = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.StockItems.Add(stockItem);
            return stockItem;
        }

        private async Task CreateLowStockNotificationIfNeeded(Batch batch)
        {
            if (batch.MinStock is null)
                return;

            var total = batch.StockItems.Sum(s => s.Quantity);
            if (total >= batch.MinStock)
                return;

            var notification = new Notification
            {
                UserId = "system",
                Message = $"Низкий остаток по партии {batch.BatchNumber}: {total} {batch.Unit}",
                RelatedId = batch.Id,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            EntityDefaults.ApplyCreationDefaults(notification);
            _context.Notifications.Add(notification);
        }
    }
}

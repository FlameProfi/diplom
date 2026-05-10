using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Backend.Models.DTO;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/stock")]
    [ApiController]
    [Authorize(Roles = "ADMIN,WAREHOUSE_WORKER,LOGIST,MANAGER")]
    [Produces("application/json")]
    public class StockController : ControllerBase
    {
        private readonly AppDbContext _context;

        public StockController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<StockDto>>> GetStock()
        {
            var dtos = await _context.StockItems
                .Select(s => new StockDto
                {
                    Id = s.Id,
                    Quantity = s.Quantity,
                    Reserved = s.Reserved,
                    Batch = new StockBatchDto
                    {
                        Id = s.Batch.Id,
                        BatchNumber = s.Batch.BatchNumber,
                        Unit = s.Batch.Unit
                    },
                    Warehouse = new StockWarehouseDto
                    {
                        Id = s.Warehouse.Id,
                        Name = s.Warehouse.Name
                    }
                }).ToListAsync();

            return Ok(dtos);
        }

        [HttpGet("batch/{batchId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<IEnumerable<StockDto>>> GetStockByBatch(string batchId)
        {
            var dtos = await _context.StockItems
                .Where(s => s.BatchId == batchId)
                .Select(s => new StockDto
                {
                    Id = s.Id,
                    Quantity = s.Quantity,
                    Reserved = s.Reserved,
                    Batch = new StockBatchDto
                    {
                        Id = s.Batch.Id,
                        BatchNumber = s.Batch.BatchNumber,
                        Unit = s.Batch.Unit
                    },
                    Warehouse = new StockWarehouseDto
                    {
                        Id = s.Warehouse.Id,
                        Name = s.Warehouse.Name
                    }
                }).ToListAsync();

            return Ok(dtos);
        }
    }
}

using Backend.Infrastructure;
using Backend.Models;
using Backend.Models.DTO;
using Backend.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[Route("api/[controller]")]
[ApiController]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthController(AppDbContext context, IJwtTokenService jwtTokenService)
    {
        _context = context;
        _jwtTokenService = jwtTokenService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginRequestDto request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null || string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            return Unauthorized("Неверный email или пароль");
        }

        var isValidPassword = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
        if (!isValidPassword)
        {
            return Unauthorized("Неверный email или пароль");
        }

        var (token, expiresAtUtc) = _jwtTokenService.GenerateToken(user);

        return Ok(new AuthResponseDto
        {
            AccessToken = token,
            ExpiresAtUtc = expiresAtUtc,
            UserId = user.Id,
            Email = user.Email,
            Role = user.Role
        });
    }

    [HttpPost("register")]
    [Authorize(Roles = "ADMIN")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AuthResponseDto>> Register(RegisterRequestDto request)
    {
        var normalizedRole = request.Role.Trim().ToUpperInvariant();
        var allowedRoles = new[] { "ADMIN", "LOGIST", "WAREHOUSE_WORKER", "MANAGER", "ACCOUNTANT", "CLIENT" };

        if (!allowedRoles.Contains(normalizedRole))
        {
            return BadRequest("Недопустимая роль");
        }

        var emailExists = await _context.Users.AnyAsync(u => u.Email == request.Email);
        if (emailExists)
        {
            return BadRequest("Пользователь с таким email уже существует");
        }

        var user = new User
        {
            Id = Guid.NewGuid().ToString(),
            Email = request.Email.Trim(),
            Name = request.Name.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = normalizedRole,
            PreferredLanguage = "RU"
        };

        EntityDefaults.ApplyCreationDefaults(user);

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var (token, expiresAtUtc) = _jwtTokenService.GenerateToken(user);

        return StatusCode(StatusCodes.Status201Created, new AuthResponseDto
        {
            AccessToken = token,
            ExpiresAtUtc = expiresAtUtc,
            UserId = user.Id,
            Email = user.Email,
            Role = user.Role
        });
    }
}

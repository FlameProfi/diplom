using Backend.Models;
using Backend.Models.DTO;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using System.Reflection;
using System.Text.Json.Serialization;


var builder = WebApplication.CreateBuilder(args);

AppDomain.CurrentDomain.UnhandledException += (_, e) =>
{
    Console.Error.WriteLine("UnhandledException: " + e.ExceptionObject);
};

TaskScheduler.UnobservedTaskException += (_, e) =>
{
    Console.Error.WriteLine("UnobservedTaskException: " + e.Exception);
    e.SetObserved();
};

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddControllers();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Metal Factory ERP API", Version = "v1" });
    //var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    //var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    //c.IncludeXmlComments(xmlPath);
});

builder.Services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());  

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

builder.Services.AddDbContext<AppDbContext>(options =>
  options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"),
  o => o
  .MapEnum<MovementType>("MovementType")
  .MapEnum<OrderStatus>("OrderStatus")
  ));

builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Metal Factory ERP API v1"));
}


app.UseCors("AllowFrontend");

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.Combine(app.Environment.ContentRootPath, "uploads")),
    RequestPath = "/uploads"
});

app.UseAuthorization();

app.MapControllers();

app.Run();

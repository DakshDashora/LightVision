from fastapi import FastAPI


from app.routes import router

app = FastAPI(title="LightVision API")
app.include_router(router)



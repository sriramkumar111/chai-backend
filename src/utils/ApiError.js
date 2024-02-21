class ApiError extends Error {
    constructor(
        statusCode,
        message= "Something went wrong",
        errors = [],
        stack = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false;

        this.errors =errors
        // for giving stack error to person . Ths generally  use in production
        if(stack){
            this.stack = stack
        }else{
            Error.captureStackTrace( this,this.constructor)
        }
        
    }
}

export {ApiError}
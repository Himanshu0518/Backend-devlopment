class ApiError extends Error {
    constructor(
        message = "Something went wrong",
        statusCode = 500,
        errors = [],
        stack = ""
        
    ) {
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.stack = stack ;
        this.erros = errors ;
        this.success = false ;
        this.message = message
     
        if(stack){
            this.stack = stack
        }else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export default ApiError
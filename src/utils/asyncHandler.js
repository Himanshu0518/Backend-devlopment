const asyncHandler = (fn) => async (req, res, next) => {

        try{
            await fn(req, res, next);
        }catch(error){
           res.status(error.code || 500).json(
            {error:error.message},
            {success:false}
        );
        }
    };
    
export default asyncHandler;
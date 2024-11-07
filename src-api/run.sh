# run fastapi server
FASTAPI=/Users/boniface/miniconda/envs/notez/bin/fastapi

start_or_stop=$1

# 如果没有传入参数，提示用户传入参数
if [ -z "$start_or_stop" ]; then
    echo "Please provide an argument: 'start' or 'stop'"
    exit 1
fi


if [ "$start_or_stop" == "start" ]; then
    echo "Starting FastAPI server"
    kill -9 $(lsof -t -i:18321)
    $FASTAPI dev ./main.py --port 18321
elif [ "$start_or_stop" == "stop" ]; then
    echo "Stopping FastAPI server"
    kill -9 $(lsof -t -i:18321)
else
    echo "Invalid argument. Use 'start' or 'stop'"
fi